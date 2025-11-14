import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2, Bug, Lightbulb } from 'lucide-react';
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
  const allowCloseRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      allowCloseRef.current = false;
    }
  }, [open]);

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

  const handleClose = () => {
    allowCloseRef.current = true;
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && allowCloseRef.current) {
      allowCloseRef.current = false;
      onOpenChange(newOpen);
    }
  };

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
      handleClose();
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] bg-[#18181B] border-[#27272A] text-white"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Request a Feature</DialogTitle>
          <DialogDescription className="text-gray-400">
            Have an idea to improve Flint? We'd love to hear it! Share your feature request below.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are you submitting?</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger 
                        className="bg-[#27272A] border-[#3F3F46] text-white"
                        data-testid="select-submission-type"
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#27272A] border-[#3F3F46] text-white">
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
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Your full name"
                      className="bg-[#27272A] border-[#3F3F46] text-white placeholder:text-gray-500"
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="your@email.com"
                      className="bg-[#27272A] border-[#3F3F46] text-white placeholder:text-gray-500"
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
                  <FormLabel>Phone Number <span className="text-gray-500">(optional)</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="bg-[#27272A] border-[#3F3F46] text-white placeholder:text-gray-500"
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
                  <FormLabel>Priority</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger 
                        className="bg-[#27272A] border-[#3F3F46] text-white"
                        data-testid="select-feature-request-priority"
                      >
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#27272A] border-[#3F3F46] text-white">
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
                  <FormLabel>Feature Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the feature you'd like to see in Flint. Be as detailed as possible!"
                      className="bg-[#27272A] border-[#3F3F46] text-white placeholder:text-gray-500 min-h-[120px] resize-y"
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
                onClick={handleClose}
                disabled={isSubmitting}
                className="bg-transparent border-[#3F3F46] text-white hover:bg-[#27272A]"
                data-testid="button-cancel-feature-request"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
      </DialogContent>
    </Dialog>
  );
}
