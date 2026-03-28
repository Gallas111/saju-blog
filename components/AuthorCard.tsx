import Link from 'next/link';

interface AuthorCardProps {
    date?: string;
    readingTime?: string;
}

export default function AuthorCard({ date, readingTime }: AuthorCardProps) {
    return (
        <div className="flex gap-4 items-start p-5 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl my-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🔮</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">사주보까 편집팀</span>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-700">명리학 콘텐츠 에디터</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                    동양철학·명리학 연구진이 전통 사주 이론과 현대 해석을 바탕으로 작성·검수합니다.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    {date && <span>📅 {date}</span>}
                    {readingTime && <span>⏱️ {readingTime}</span>}
                    <Link href="/about" className="text-purple-500 hover:underline font-medium">소개 보기</Link>
                </div>
            </div>
        </div>
    );
}
