/**
 * Flint Blog Post - Individual blog post page for SEO
 * Route: /blog/:slug
 */

import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import { Calendar, ArrowLeft, Tag, User } from "lucide-react";
import { BeamsBackground } from "@/components/ui/beams-background";
import { LandingHeader } from "@/components/layout/landing-header";
import flintLogo from "@assets/flint-logo.png";

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  heroImage: string | null;
  tags: string[] | null;
  publishedAt: string | null;
  createdAt: string;
  authorName: string | null;
}

function renderMarkdown(content: string): string {
  let html = content
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-8 mb-4 text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-10 mb-4 text-white">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-12 mb-6 text-white">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n\n/gim, '</p><p class="mb-4 text-gray-300 leading-relaxed">');

  return `<p class="mb-4 text-gray-300 leading-relaxed">${html}</p>`;
}

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ['/api/blog/posts', slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/posts/${slug}`);
      if (!res.ok) {
        throw new Error('Post not found');
      }
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <BeamsBackground className="min-h-screen text-white overflow-x-hidden">
        <LandingHeader currentPage="blog" />
        <main className="pt-28 pb-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse">
              <div className="h-10 bg-white/10 rounded w-3/4 mb-6" />
              <div className="h-4 bg-white/10 rounded w-1/4 mb-8" />
              <div className="space-y-4">
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
              </div>
            </div>
          </div>
        </main>
      </BeamsBackground>
    );
  }

  if (error || !post) {
    return (
      <>
        <Helmet>
          <title>Post Not Found | Flint Blog</title>
        </Helmet>
        <BeamsBackground className="min-h-screen text-white overflow-x-hidden">
          <LandingHeader currentPage="blog" />
          <main className="pt-28 pb-20 px-4">
            <div className="max-w-3xl mx-auto text-center py-20">
              <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
              <p className="text-gray-400 mb-8">Sorry, we couldn't find the blog post you're looking for.</p>
              <Link href="/blog" className="text-blue-400 hover:underline flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Blog
              </Link>
            </div>
          </main>
        </BeamsBackground>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | Flint Blog</title>
        <meta name="description" content={post.excerpt || `Read ${post.title} on the Flint blog.`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || `Read ${post.title} on the Flint blog.`} />
        <meta property="og:type" content="article" />
        {post.heroImage && <meta property="og:image" content={post.heroImage} />}
        <meta property="article:published_time" content={post.publishedAt || post.createdAt} />
        {post.tags && post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "image": post.heroImage,
            "datePublished": post.publishedAt || post.createdAt,
            "author": {
              "@type": "Person",
              "name": post.authorName || "Flint Team"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Flint",
              "logo": {
                "@type": "ImageObject",
                "url": "https://flint-investing.com/favicon.png"
              }
            }
          })}
        </script>
      </Helmet>

      <BeamsBackground className="min-h-screen text-white overflow-x-hidden">
        <LandingHeader currentPage="blog" />

        <main className="pt-28 pb-20 px-4">
          <article className="max-w-3xl mx-auto">
            <Link href="/blog" className="text-gray-400 hover:text-white flex items-center gap-2 mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>

            {post.heroImage && (
              <div className="w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
                <img 
                  src={post.heroImage} 
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <header className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                {post.authorName && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {post.authorName}
                  </span>
                )}
                {post.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
                  </span>
                )}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                  <Tag className="h-4 w-4" />
                  <span>{post.tags.join(' · ')}</span>
                </div>
              )}
            </header>

            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />
          </article>
        </main>

        <footer className="border-t border-white/10 bg-white/5 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <img src={flintLogo} alt="Flint" className="h-8 w-auto" />
                <span className="text-xl font-semibold">Flint</span>
              </div>

              <div className="flex gap-6 text-sm text-gray-400">
                <Link href="/new" className="hover:text-white transition-colors">Home</Link>
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/support" className="hover:text-white transition-colors">Support</Link>
              </div>
            </div>

            <div className="mt-8 text-center text-sm text-gray-400">
              <p>Flint is not a broker or bank. Investing and transfers depend on the platforms you connect.</p>
            </div>
          </div>
        </footer>
      </BeamsBackground>
    </>
  );
}
