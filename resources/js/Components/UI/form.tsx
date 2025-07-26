import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@radix-ui/react-label"
import { AlertCircle, Check } from "lucide-react"

// Form context for managing form state
interface FormContextType {
  errors: Record<string, string>
  touched: Record<string, boolean>
  values: Record<string, any>
  setFieldValue: (name: string, value: any) => void
  setFieldError: (name: string, error: string) => void
  setFieldTouched: (name: string, touched: boolean) => void
}

const FormContext = React.createContext<FormContextType | null>(null)

export function useFormField(name: string) {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error('useFormField must be used within a Form component')
  }
  
  const error = context.errors[name]
  const touched = context.touched[name]
  const value = context.values[name]
  
  return {
    error,
    touched,
    value,
    hasError: !!(error && touched),
    setFieldValue: (value: any) => context.setFieldValue(name, value),
    setFieldError: (error: string) => context.setFieldError(name, error),
    setFieldTouched: (touched: boolean) => context.setFieldTouched(name, touched)
  }
}

// Form component
interface FormProps {
  children: React.ReactNode
  onSubmit?: (values: Record<string, any>) => void
  initialValues?: Record<string, any>
  validationSchema?: (values: Record<string, any>) => Record<string, string>
  className?: string
}

export function Form({ 
  children, 
  onSubmit, 
  initialValues = {}, 
  validationSchema,
  className 
}: FormProps) {
  const [values, setValues] = React.useState(initialValues)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  const setFieldValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const setFieldError = (name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const setFieldTouched = (name: string, touched: boolean) => {
    setTouched(prev => ({ ...prev, [name]: touched }))
  }

  const validate = () => {
    if (validationSchema) {
      const newErrors = validationSchema(values)
      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {} as Record<string, boolean>)
    setTouched(allTouched)
    
    if (validate()) {
      onSubmit?.(values)
    }
  }

  const contextValue: FormContextType = {
    errors,
    touched,
    values,
    setFieldValue,
    setFieldError,
    setFieldTouched
  }

  return (
    <FormContext.Provider value={contextValue}>
      <form onSubmit={handleSubmit} className={className}>
        {children}
      </form>
    </FormContext.Provider>
  )
}

// Form field components
interface FormFieldProps {
  name: string
  label?: string
  description?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({ 
  name, 
  label, 
  description, 
  required, 
  children, 
  className 
}: FormFieldProps) {
  const { error, touched, hasError } = useFormField(name)

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {children}
        
        {hasError && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
        )}
      </div>
      
      {description && !hasError && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {hasError && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// Enhanced Input component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
}

export function Input({ name, className, ...props }: InputProps) {
  const { value, hasError, setFieldValue, setFieldTouched } = useFormField(name)

  return (
    <input
      id={name}
      name={name}
      value={value || ''}
      onChange={(e) => setFieldValue(e.target.value)}
      onBlur={() => setFieldTouched(true)}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        hasError && "border-destructive focus-visible:ring-destructive",
        className
      )}
      {...props}
    />
  )
}

// Textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string
}

export function Textarea({ name, className, ...props }: TextareaProps) {
  const { value, hasError, setFieldValue, setFieldTouched } = useFormField(name)

  return (
    <textarea
      id={name}
      name={name}
      value={value || ''}
      onChange={(e) => setFieldValue(e.target.value)}
      onBlur={() => setFieldTouched(true)}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        hasError && "border-destructive focus-visible:ring-destructive",
        className
      )}
      {...props}
    />
  )
}

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ name, options, placeholder, className, ...props }: SelectProps) {
  const { value, hasError, setFieldValue, setFieldTouched } = useFormField(name)

  return (
    <select
      id={name}
      name={name}
      value={value || ''}
      onChange={(e) => setFieldValue(e.target.value)}
      onBlur={() => setFieldTouched(true)}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        hasError && "border-destructive focus-visible:ring-destructive",
        className
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

// Checkbox component
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  name: string
  label?: string
}

export function Checkbox({ name, label, className, ...props }: CheckboxProps) {
  const { value, hasError, setFieldValue, setFieldTouched } = useFormField(name)

  return (
    <div className="flex items-center space-x-2">
      <input
        id={name}
        name={name}
        type="checkbox"
        checked={!!value}
        onChange={(e) => setFieldValue(e.target.checked)}
        onBlur={() => setFieldTouched(true)}
        className={cn(
          "h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2",
          hasError && "border-destructive",
          className
        )}
        {...props}
      />
      {label && (
        <Label htmlFor={name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      )}
    </div>
  )
}

// Form validation utilities
export const validators = {
  required: (message = 'This field is required') => (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message
    }
    return ''
  },
  
  email: (message = 'Invalid email address') => (value: string) => {
    if (value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
      return message
    }
    return ''
  },
  
  minLength: (min: number, message?: string) => (value: string) => {
    if (value && value.length < min) {
      return message || `Must be at least ${min} characters`
    }
    return ''
  },
  
  maxLength: (max: number, message?: string) => (value: string) => {
    if (value && value.length > max) {
      return message || `Must be no more than ${max} characters`
    }
    return ''
  },
  
  pattern: (pattern: RegExp, message = 'Invalid format') => (value: string) => {
    if (value && !pattern.test(value)) {
      return message
    }
    return ''
  }
}

// Compose multiple validators
export function composeValidators(...validators: Array<(value: any) => string>) {
  return (value: any) => {
    for (const validator of validators) {
      const error = validator(value)
      if (error) return error
    }
    return ''
  }
}