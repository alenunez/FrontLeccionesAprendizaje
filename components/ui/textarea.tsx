import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  function Textarea({ className, onChange, ...props }, ref) {
    const innerRef = React.useRef<HTMLTextAreaElement>(null)

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref],
    )

    const adjustHeight = React.useCallback(() => {
      const textarea = innerRef.current
      if (!textarea) return

      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }, [])

    React.useEffect(() => {
      adjustHeight()
    }, [props.value, adjustHeight])

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight()
      onChange?.(event)
    }

    return (
      <textarea
        data-slot="textarea"
        ref={setRefs}
        className={cn(
          'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex min-h-16 w-full max-h-none resize-none overflow-hidden break-words rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        onChange={handleChange}
        {...props}
      />
    )
  },
)

export { Textarea }
