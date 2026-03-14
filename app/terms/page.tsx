import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "이용약관",
  description: "사주보까 블로그 이용약관입니다.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gold-light mb-8">
          이용약관
        </h1>
        <div className="prose text-foreground space-y-6 text-sm leading-relaxed">
          <p className="text-muted">시행일: 2026년 3월 1일</p>

          <section>
            <h2>제1조 (목적)</h2>
            <p>
              본 약관은 사주보까 스토리(이하 &quot;사이트&quot;, sajubokastory.com)가
              제공하는 블로그 서비스의 이용 조건 및 절차에 관한 사항을 규정함을
              목적으로 합니다.
            </p>
          </section>

          <section>
            <h2>제2조 (정의)</h2>
            <ol>
              <li>
                &quot;사이트&quot;란 사주보까 스토리가 운영하는 인터넷 블로그
                (sajubokastory.com)를 말합니다.
              </li>
              <li>
                &quot;이용자&quot;란 본 사이트에 접속하여 본 약관에 따라 제공되는
                서비스를 이용하는 모든 방문자를 말합니다.
              </li>
              <li>
                &quot;콘텐츠&quot;란 사이트에 게시된 글, 이미지 등 모든 정보를
                말합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2>제3조 (약관의 효력 및 변경)</h2>
            <ol>
              <li>본 약관은 사이트에 공시함으로써 효력을 발생합니다.</li>
              <li>
                사이트는 관련 법령에 위배되지 않는 범위에서 약관을 변경할 수
                있으며, 변경 시 사이트에 공지합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2>제4조 (서비스의 내용)</h2>
            <p>
              사이트는 사주, 운세, 꿈 해몽, 타로, 궁합, 명리학 등에 관한 정보성
              콘텐츠를 제공합니다. 본 사이트의 콘텐츠는 오락 및 참고 목적으로
              제공되며, 전문적인 의료, 법률, 재정 자문을 대체하지 않습니다.
            </p>
          </section>

          <section>
            <h2>제5조 (이용자의 의무)</h2>
            <ol>
              <li>
                이용자는 사이트 이용 시 관련 법령, 본 약관 및 사이트에서 공지하는
                사항을 준수하여야 합니다.
              </li>
              <li>
                이용자는 사이트의 콘텐츠를 무단 복제, 배포, 전송, 수정하거나
                상업적으로 이용할 수 없습니다.
              </li>
              <li>
                이용자는 다른 이용자의 권리를 침해하거나 사이트 운영을 방해하는
                행위를 하여서는 안 됩니다.
              </li>
            </ol>
          </section>

          <section>
            <h2>제6조 (지식재산권)</h2>
            <p>
              사이트에 게시된 모든 콘텐츠(글, 이미지, 디자인 등)에 대한
              저작권 및 지식재산권은 사주보까 스토리에 귀속됩니다. 이용자는 사이트
              운영자의 사전 서면 동의 없이 이를 복제, 배포, 방송, 기타 방법으로
              이용하거나 제3자에게 제공할 수 없습니다.
            </p>
          </section>

          <section>
            <h2>제7조 (면책 조항)</h2>
            <ol>
              <li>
                사이트에서 제공하는 콘텐츠는 정보 제공 및 오락 목적이며, 그
                정확성이나 완전성을 보장하지 않습니다.
              </li>
              <li>
                이용자가 사이트의 콘텐츠를 참고하여 내린 판단이나 행동에 대해
                사이트는 책임을 지지 않습니다.
              </li>
              <li>
                천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해
                사이트는 책임을 지지 않습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2>제8조 (광고 게재)</h2>
            <p>
              사이트는 운영을 위하여 Google 애드센스 등 제3자 광고를 게재할 수
              있습니다. 광고로 인해 발생하는 거래는 해당 광고주와 이용자 간의
              문제이며, 사이트는 이에 대한 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2>제9조 (준거법 및 관할법원)</h2>
            <p>
              본 약관의 해석 및 분쟁 해결은 대한민국 법률에 따르며, 분쟁이 발생할
              경우 민사소송법에 따른 관할법원에서 해결합니다.
            </p>
          </section>

          <section>
            <h2>부칙</h2>
            <p>본 약관은 2026년 3월 1일부터 시행합니다.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
