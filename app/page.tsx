import { getAllPosts } from "@/lib/posts";
import { getAllTags } from "@/lib/tags";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogCard from "@/components/BlogCard";
import CategoryFilter from "@/components/CategoryFilter";
import TagCloud from "@/components/TagCloud";
import Pagination from "@/components/Pagination";

const POSTS_PER_PAGE = 10;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const posts = getAllPosts();
  const tags = getAllTags();

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const currentPosts = posts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1">
        {/* Hero */}
        <section className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gold-light mb-3">
            사주보까 블로그
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            사주, 운세, 꿈 해몽, 타로, 일주론 등 운세 정보를 매일 업데이트합니다.
          </p>
        </section>

        {/* Category filter */}
        <CategoryFilter />

        {/* Posts grid */}
        <div className="grid gap-4">
          {currentPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

        {currentPosts.length === 0 && (
          <div className="text-center py-20 text-muted">
            <p className="text-4xl mb-4">📭</p>
            <p>아직 포스트가 없습니다.</p>
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} />

        {/* Tag cloud */}
        {tags.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-gold-light mb-4">
              인기 태그
            </h2>
            <TagCloud tags={tags} />
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
