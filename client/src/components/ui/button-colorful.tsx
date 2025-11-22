import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface ButtonColorfulProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
}

export function ButtonColorful({
    className,
    label = "Explore Components",
    ...props
}: ButtonColorfulProps) {
    return (
        <button
            className={cn(
                "relative h-10 px-6 rounded-full overflow-hidden",
                "bg-blue-600 hover:bg-blue-700",
                "text-white font-medium",
                "transition-all duration-200",
                "hover:shadow-lg hover:shadow-blue-600/50",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                "active:scale-95",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            {...props}
        >
            {/* Content */}
            <div className="relative flex items-center justify-center gap-2">
                <span>{label}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
        </button>
    );
}
