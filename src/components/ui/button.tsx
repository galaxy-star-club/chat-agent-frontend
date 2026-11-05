import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-800 disabled:pointer-events-none disabled:opacity-50",
  { variants: { variant: { default: "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100" } }, defaultVariants: { variant: "default" } },
);

export function Button({ asChild = false, className, variant, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, className }))} {...props} />;
}
