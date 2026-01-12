import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bug, Lightbulb, X } from 'lucide-react';
import { insertFeatureRequestSchema, type InsertFeatureRequest } from '@shared/schema';

// Extend the shared schema with additional frontend-specific validation
const featureRequestSchema = insertFeatureRequestSchema.extend({
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
});

type FeatureRequestFormData = z.infer<typeof featureRequestSchema>;

interface FeatureRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeatureRequestModal({ open, onOpenChange }: FeatureRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FeatureRequestFormData>({
    resolver: zodResolver(featureRequestSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      type: 'feature_request',
      priority: 'medium',
      description: '',
    },
  });

  const onSubmit = async (data: FeatureRequestFormData) => {
    setIsSubmitting(true);

    try {
      const response = await apiRequest('/api/feature-requests', { 
        method: 'POST', 
        body: data 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit feature request');
      }

      toast({
        title: 'Feature request submitted!',
        description: "Thank you for your feedback. We'll review your request shortly.",
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div className="relative !bg-white border !border-[#E5E2DC] rounded-lg shadow-xl max-w-[600px] w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFFFF' }}>
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10"
          data-testid="button-close-modal"
        >
          <X className="h-4 w-4 text-gray-500" />
          <span className="sr-only">Close</span>
        </button>

        <div className="p-6" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl font-bold !text-gray-900" style={{ color: '#111827' }}>Request a Feature</h2>
            <p className="!text-gray-600" style={{ color: '#4B5563' }}>
              Have an idea to improve Flint? We'd love to hear it! Share your feature request below.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-gray-900" style={{ color: '#111827' }}>What are you submitting?</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger 
                          className="!bg-[#F9F8F6] !border-[#E5E2DC] !text-gray-900"
                          style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E2DC', color: '#111827' }}
                          data-testid="select-submission-type"
                        >
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="!bg-white !border-[#E5E2DC] !text-gray-900" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E2DC', color: '#111827' }}>
                        <SelectItem value="feature_request" data-testid="type-feature-request">
                          <span className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            Feature Request - Suggest new functionality
                          </span>
                        </SelectItem>
                        <SelectItem value="bug_report" data-testid="type-bug-report">
                          <span className="flex items-center gap-2">
                            <Bug className="w-4 h-4 text-red-500" />
                            Bug Report - Report something broken
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-gray-900" style={{ color: '#111827' }}>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Your full name"
                        className="!bg-[#F9F8F6] !border-[#E5E2DC] !text-gray-900 placeholder:text-gray-400"
                        style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E2DC', color: '#111827' }}
                        data-testid="input-feature-request-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-gray-900" style={{ color: '#111827' }}>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="your@email.com"
                        className="!bg-[#F9F8F6] !border-[#E5E2DC] !text-gray-900 placeholder:text-gray-400"
                        style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E2DC', color: '#111827' }}
                        data-testid="input-feature-request-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone (Optional) */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-gray-900" style={{ color: '#111827' }}>Phone Number <span className="!text-gray-500" style={{ color: '#6B7280' }}>(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="!bg-[#F9F8F6] !border-[#E5E2DC] !text-gray-900 placeholder:text-gray-400"
                        style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E2DC', color: '#111827' }}
                        data-testid="input-feature-request-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-gray-900" style={{ color: '#111827' }}>Priority</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger 
                          className="!bg-[#F9F8F6] !border-[#E5E2DC] !text-gray-900"
                          style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E2DC', color: '#111827' }}
                          data-testid="select-feature-request-priority"
                        >
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="!bg-white !border-[#E5E2DC] !text-gray-900" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E2DC', color: '#111827' }}>
                        <SelectItem value="low" data-testid="priority-low">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Low - Nice to have
                          </span>
                        </SelectItem>
                        <SelectItem value="medium" data-testid="priority-medium">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            Medium - Would be helpful
                          </span>
                        </SelectItem>
                        <SelectItem value="high" data-testid="priority-high">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            High - Really need this
                          </span>
                        </SelectItem>
                        <SelectItem value="critical" data-testid="priority-critical">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Critical - Blocking my workflow
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-gray-900" style={{ color: '#111827' }}>Feature Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the feature you'd like to see in Flint. Be as detailed as possible!"
                        className="!bg-[#F9F8F6] !border-[#E5E2DC] !text-gray-900 placeholder:text-gray-400 min-h-[120px] resize-y"
                        style={{ backgroundColor: '#F9F8F6', borderColor: '#E5E2DC', color: '#111827' }}
                        data-testid="textarea-feature-request-description"
                      />
                    </FormControl>
                    <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                      <FormMessage />
                      <span>{field.value?.length || 0}/2000</span>
                    </div>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="!bg-transparent !border-[#E5E2DC] !text-gray-700 hover:!bg-[#F4F2ED]"
                  style={{ backgroundColor: 'transparent', borderColor: '#E5E2DC', color: '#374151' }}
                  data-testid="button-cancel-feature-request"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="!bg-blue-600 hover:!bg-blue-700 !text-white"
                  style={{ backgroundColor: '#2563EB', color: 'white' }}
                  data-testid="button-submit-feature-request"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
