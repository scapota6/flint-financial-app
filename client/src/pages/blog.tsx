/**
 * Flint Blog - Public blog listing page for SEO
 * Route: /blog
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { Calendar, ArrowRight, Tag } from "lucide-react";
import { BeamsBackground } from "@/components/ui/beams-background";
import { LandingHeader } from "@/components/layout/landing-header";
import flintLogo from "@assets/flint-logo.png";

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  heroImage: string | null;
  tags: string[] | null;
  publishedAt: string | null;
  authorName: string | null;
}

export default function Blog() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog/posts'],
  });

  return (
    <>
      <Helmet>
        <title>Blog | Financial Tips & Insights | Flint</title>
        <meta name="description" content="Read the latest articles on personal finance, investing strategies, crypto insights, and money management tips from the Flint team." />
        <meta property="og:title" content="Flint Blog | Financial Tips & Insights" />
        <meta property="og:description" content="Expert articles on managing your money, investing wisely, and building wealth." />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="personal finance blog, investing tips, crypto insights, money management, financial planning" />
      </Helmet>

      <BeamsBackground className="min-h-screen text-white overflow-x-hidden">
        <LandingHeader currentPage="blog" />

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                The Flint <span className="text-blue-400">Blog</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Insights on money management, investing, and building your financial future.
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
                    <div className="h-6 bg-white/10 rounded w-3/4 mb-4" />
                    <div className="h-4 bg-white/10 rounded w-full mb-2" />
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <article 
                      className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors cursor-pointer group"
                      data-testid={`blog-post-${post.id}`}
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        {post.heroImage && (
                          <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              src={post.heroImage} 
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h2 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                            {post.title}
                          </h2>
                          {post.excerpt && (
                            <p className="text-gray-400 mb-4 line-clamp-2">{post.excerpt}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            {post.publishedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                              </span>
                            )}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                {post.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex items-center gap-1 text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                            Read more <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg mb-4">No blog posts yet.</p>
                <p className="text-gray-500">Check back soon for new content!</p>
              </div>
            )}
          </div>
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
