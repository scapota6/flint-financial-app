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
        <Button
            className={cn(
                "relative h-10 px-6 overflow-hidden",
                "bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300",
                "transition-all duration-200",
                "group rounded-full",
                "hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400",
                className
            )}
            {...props}
        >
            {/* Content */}
            <div className="relative flex items-center justify-center gap-2">
                <span className="text-gray-900 font-medium">{label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-900" />
            </div>
        </Button>
    );
}
