import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-[0_12px_28px_rgba(157,87,44,0.14)]",
  {
    variants: {
      variant: {
        default:
          "border border-[rgba(246,191,156,0.42)] bg-[linear-gradient(180deg,rgba(245,182,146,0.98),rgba(232,155,111,0.96))] text-[#3f210d] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(247,197,167,1),rgba(237,164,123,0.98))] hover:shadow-[0_18px_34px_rgba(157,87,44,0.22)]",
        destructive:
          "border border-[rgba(246,177,177,0.42)] bg-[linear-gradient(180deg,rgba(247,179,179,0.98),rgba(235,132,132,0.94))] text-[#4f1212] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(248,191,191,1),rgba(239,146,146,0.98))]",
        outline:
          "border border-[rgba(245,184,149,0.28)] bg-[rgba(251,174,127,0.08)] text-[#f6c7a8] hover:-translate-y-0.5 hover:bg-[rgba(251,174,127,0.14)] hover:text-[#ffe7d4]",
        secondary:
          "border border-[rgba(245,184,149,0.28)] bg-[rgba(251,174,127,0.12)] text-[#ffd8bf] hover:-translate-y-0.5 hover:bg-[rgba(251,174,127,0.2)] hover:shadow-[0_16px_30px_rgba(157,87,44,0.18)]",
        ghost:
          "border border-transparent bg-transparent text-[#f5c4a1] hover:-translate-y-0.5 hover:border-[rgba(245,184,149,0.22)] hover:bg-[rgba(251,174,127,0.12)] hover:text-[#ffe6d2]",
        link: "text-[#f3ba94] underline-offset-4 hover:text-[#ffd8be] hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
