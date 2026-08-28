import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BootstrapRequest {
  clinicName: string;
}

interface BootstrapResponse {
  clinicId: string;
  clinicName: string;
  slug: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if user already has a clinic
    const { data: existing } = await supabase
      .from("clinic_memberships")
      .select("clinic_id")
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("id, name, slug")
        .eq("id", existing[0].clinic_id)
        .maybeSingle();

      if (clinic) {
        return new Response(
          JSON.stringify({
            clinicId: clinic.id,
            clinicName: clinic.name,
            slug: clinic.slug,
          } satisfies BootstrapResponse),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { clinicName } = (await req.json()) as BootstrapRequest;
    if (!clinicName || !clinicName.trim()) {
      return new Response(
        JSON.stringify({ error: "Clinic name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate unique slug
    const baseSlug = await generateSlug(supabase, clinicName.trim());

    // Create clinic
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .insert({ name: clinicName.trim(), slug: baseSlug })
      .select("id, name, slug")
      .single();

    if (clinicError || !clinic) {
      return new Response(
        JSON.stringify({ error: clinicError?.message || "Failed to create clinic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create owner membership
    const { error: membershipError } = await supabase
      .from("clinic_memberships")
      .insert({ clinic_id: clinic.id, user_id: user.id, role: "owner" });

    if (membershipError) {
      // Cleanup orphan clinic
      await supabase.from("clinics").delete().eq("id", clinic.id);
      return new Response(
        JSON.stringify({ error: membershipError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create default settings
    await supabase.from("clinic_settings").insert({
      clinic_id: clinic.id,
      settings: {
        currency: "USD",
        timezone: "America/New_York",
        claimFormat: "electronic",
        clearinghouse: null,
      },
    });

    // Seed default referral sources
    const defaultReferralSources = [
      "Walk-in", "Google", "Instagram", "Facebook",
      "Referral", "Justdial", "Practo", "Camp",
    ];
    await supabase.from("referral_sources").insert(
      defaultReferralSources.map((name) => ({ clinic_id: clinic.id, name })),
    );

    // Seed default procedure categories
    const defaultCategories = [
      "Consultation & Diagnosis", "Radiography", "Preventive", "Restorative",
      "Endodontics", "Oral Surgery", "Prosthodontics", "Periodontics",
      "Orthodontics", "Cosmetic",
    ];
    const { data: catData } = await supabase
      .from("procedure_categories")
      .insert(defaultCategories.map((name, i) => ({ clinic_id: clinic.id, name, display_order: i })))
      .select("id, name");

    // Seed default procedures
    const defaultProcedures: { category: string; name: string; code?: string; fee: number; sittings: number; duration?: number }[] = [
      { category: "Consultation & Diagnosis", name: "Consultation", code: "CONS", fee: 500, sittings: 1, duration: 30 },
      { category: "Radiography", name: "IOPA", code: "IOPA", fee: 200, sittings: 1, duration: 10 },
      { category: "Radiography", name: "RVG", code: "RVG", fee: 250, sittings: 1, duration: 10 },
      { category: "Radiography", name: "OPG", code: "OPG", fee: 600, sittings: 1, duration: 15 },
      { category: "Preventive", name: "Scaling", code: "SCAL", fee: 1000, sittings: 1, duration: 45 },
      { category: "Preventive", name: "Root Planing", code: "RP", fee: 1500, sittings: 1, duration: 60 },
      { category: "Preventive", name: "Fluoride Application", code: "FLU", fee: 500, sittings: 1, duration: 20 },
      { category: "Preventive", name: "Sealant Application", code: "SEAL", fee: 400, sittings: 1, duration: 20 },
      { category: "Restorative", name: "Composite Restoration", code: "COMP", fee: 1500, sittings: 1, duration: 45 },
      { category: "Restorative", name: "GIC Restoration", code: "GIC", fee: 800, sittings: 1, duration: 30 },
      { category: "Restorative", name: "Amalgam Restoration", code: "AMAL", fee: 700, sittings: 1, duration: 30 },
      { category: "Endodontics", name: "RCT", code: "RCT", fee: 4000, sittings: 3, duration: 60 },
      { category: "Endodontics", name: "Re-RCT", code: "RERCT", fee: 6000, sittings: 3, duration: 60 },
      { category: "Endodontics", name: "Pulpotomy", code: "PULP", fee: 2000, sittings: 1, duration: 45 },
      { category: "Oral Surgery", name: "Extraction", code: "EXT", fee: 800, sittings: 1, duration: 30 },
      { category: "Oral Surgery", name: "Surgical Extraction", code: "SEXT", fee: 2500, sittings: 1, duration: 45 },
      { category: "Oral Surgery", name: "Disimpaction", code: "DIS", fee: 8000, sittings: 1, duration: 90 },
      { category: "Prosthodontics", name: "PFM Crown", code: "PFM", fee: 6000, sittings: 2, duration: 60 },
      { category: "Prosthodontics", name: "Zirconia Crown", code: "ZIR", fee: 12000, sittings: 2, duration: 60 },
      { category: "Prosthodontics", name: "E-max Crown", code: "EMAX", fee: 15000, sittings: 2, duration: 60 },
      { category: "Prosthodontics", name: "Bridge", code: "BRG", fee: 18000, sittings: 3, duration: 90 },
      { category: "Prosthodontics", name: "Complete Denture", code: "CD", fee: 15000, sittings: 5, duration: 60 },
      { category: "Prosthodontics", name: "RPD", code: "RPD", fee: 10000, sittings: 4, duration: 60 },
      { category: "Prosthodontics", name: "Implant Placement", code: "IMP", fee: 30000, sittings: 2, duration: 90 },
      { category: "Prosthodontics", name: "Implant Crown", code: "IMPC", fee: 15000, sittings: 2, duration: 60 },
      { category: "Periodontics", name: "Gingivectomy", code: "GV", fee: 3000, sittings: 1, duration: 45 },
      { category: "Periodontics", name: "Flap Surgery", code: "FLAP", fee: 8000, sittings: 2, duration: 90 },
      { category: "Cosmetic", name: "Bleaching", code: "BLCH", fee: 10000, sittings: 1, duration: 60 },
      { category: "Cosmetic", name: "Veneer", code: "VEN", fee: 10000, sittings: 2, duration: 60 },
      { category: "Orthodontics", name: "Orthodontic Consultation", code: "ORTHO_C", fee: 1000, sittings: 1, duration: 45 },
      { category: "Orthodontics", name: "Orthodontic Treatment", code: "ORTHO_T", fee: 40000, sittings: 12, duration: 60 },
      { category: "Orthodontics", name: "Retainer", code: "RET", fee: 3000, sittings: 1, duration: 30 },
    ];

    const catMap: Record<string, string> = {};
    for (const c of catData ?? []) {
      catMap[(c as { name: string }).name] = (c as { id: string }).id;
    }

    await supabase.from("procedures").insert(
      defaultProcedures.map((p) => ({
        clinic_id: clinic.id,
        category_id: catMap[p.category] ?? null,
        name: p.name,
        code: p.code ?? null,
        default_fee: p.fee,
        expected_sittings: p.sittings,
        expected_duration_min: p.duration ?? null,
        active: true,
      })),
    );

    // Audit log
    await supabase.from("audit_log").insert({
      clinic_id: clinic.id,
      user_id: user.id,
      action: "clinic.created",
      entity: "clinic",
      entity_id: clinic.id,
      metadata: { name: clinic.name, slug: clinic.slug },
    });

    return new Response(
      JSON.stringify({
        clinicId: clinic.id,
        clinicName: clinic.name,
        slug: clinic.slug,
      } satisfies BootstrapResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateSlug(
  supabase: ReturnType<typeof createClient>,
  name: string,
): Promise<string> {
  const base = slugify(name) || "clinic";
  let slug = base;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from("clinics")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;
    slug = `${base}-${suffix++}`;
  }
}
