export interface LineItemInput {
  quantity: number;
  unit_price: number;
  discount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax_amount: number;
  total: number;
}

export function calculateLineTotal(unitPrice: number, quantity: number, discount: number): number {
  return Math.max(0, unitPrice * quantity - Math.max(0, discount));
}

export function calculateInvoiceTotals(items: LineItemInput[], taxRate: number, globalDiscount: number): InvoiceTotals {
  const subtotal = items.reduce((sum, i) => sum + calculateLineTotal(i.unit_price, i.quantity, i.discount), 0);
  const afterDiscount = Math.max(0, subtotal - Math.max(0, globalDiscount));
  const taxAmount = Math.round(afterDiscount * (taxRate / 100) * 100) / 100;
  const total = afterDiscount + taxAmount;
  return { subtotal, tax_amount: taxAmount, total };
}

export function calculatePaymentAllocation(currentAmountPaid: number, invoiceTotal: number, paymentAmount: number): {
  newAmountPaid: number;
  newBalance: number;
  allocatedAmount: number;
  excessAmount: number;
} {
  const maxRemaining = Math.max(0, invoiceTotal - currentAmountPaid);
  const allocatedAmount = Math.min(paymentAmount, maxRemaining);
  const excessAmount = Math.max(0, paymentAmount - maxRemaining);
  const newAmountPaid = currentAmountPaid + allocatedAmount;
  const newBalance = Math.max(0, invoiceTotal - newAmountPaid);
  return { newAmountPaid, newBalance, allocatedAmount, excessAmount };
}
