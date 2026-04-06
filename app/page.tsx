import { getAllPosts } from "@/lib/posts";
import { getAllTags } from "@/lib/tags";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryFilter from "@/components/CategoryFilter";
import FeaturedPosts from "@/components/FeaturedPosts";
import TagCloud from "@/components/TagCloud";
import ClientPagination from "@/components/ClientPagination";

export default function HomePage() {
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1">
        {/* Hero */}
        <section className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gold-light mb-3">
            사주보까 블로그
          </h1>
          <p className="text-muted max-w-xl mx-auto mb-5">
            사주, 운세, 꿈 해몽, 타로, 일주론 등 운세 정보를 매일 업데이트합니다.
          </p>
          <a
            href="https://www.sajuboka.com/saju"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-background font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
          >
            내 사주 무료 분석하기 &rarr;
          </a>
        </section>

        {/* Featured posts */}
        <FeaturedPosts posts={posts} />

        {/* Category filter */}
        <CategoryFilter />

        {/* Posts grid with pagination */}
        <ClientPagination posts={posts} />

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
