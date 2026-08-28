import { Search, X } from 'lucide-react';
import { InputHTMLAttributes, forwardRef } from 'react';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          className="input pl-9 pr-9"
          {...props}
        />
        {props.value && onClear && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
export default SearchInput;
