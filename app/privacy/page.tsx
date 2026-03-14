import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "사주보까 블로그 개인정보 처리방침입니다.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold text-gold-light mb-8">
          개인정보 처리방침
        </h1>
        <div className="prose text-foreground space-y-6 text-sm leading-relaxed">
          <p className="text-muted">시행일: 2026년 3월 1일</p>

          <p>
            사주보까 스토리(이하 &quot;사이트&quot;, sajubokastory.com)는 이용자의
            개인정보를 소중히 여기며, 「개인정보 보호법」 및 관련 법령에 따라
            아래와 같이 개인정보 처리방침을 수립·공개합니다.
          </p>

          <section>
            <h2>1. 수집하는 개인정보 항목</h2>
            <p>
              본 사이트는 별도의 회원가입 절차 없이 운영되며, 이용자로부터 직접적인
              개인정보를 수집하지 않습니다. 다만, 사이트 이용 과정에서 아래 정보가
              자동으로 생성·수집될 수 있습니다.
            </p>
            <ul>
              <li>접속 IP 주소, 브라우저 종류 및 버전, 운영체제</li>
              <li>방문 일시, 페이지 조회 기록, 서비스 이용 기록</li>
              <li>쿠키(Cookie) 정보</li>
            </ul>
          </section>

          <section>
            <h2>2. 개인정보의 수집 및 이용 목적</h2>
            <p>자동 수집되는 정보는 다음의 목적을 위해 활용됩니다.</p>
            <ul>
              <li>사이트 이용 통계 분석 및 서비스 개선</li>
              <li>콘텐츠 이용 현황 파악</li>
              <li>부정 이용 방지 및 서비스 안정성 확보</li>
            </ul>
          </section>

          <section>
            <h2>3. 쿠키(Cookie)의 사용</h2>
            <p>
              본 사이트는 이용자 경험 향상 및 통계 분석을 위해 쿠키를 사용합니다.
              이용자는 브라우저 설정을 통해 쿠키의 저장을 거부할 수 있으나, 이 경우
              일부 서비스 이용이 제한될 수 있습니다.
            </p>
            <h3>사용 중인 쿠키</h3>
            <ul>
              <li>
                <strong>Google 애널리틱스 (GA4)</strong>: 사이트 방문 통계 및 이용
                패턴 분석을 위해 Google에서 제공하는 웹 분석 서비스를 이용합니다.
                Google 애널리틱스는 쿠키를 통해 익명화된 데이터를 수집하며,
                수집된 데이터는 Google의{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  개인정보처리방침
                </a>
                에 따라 처리됩니다.
              </li>
              <li>
                <strong>Google 애드센스</strong>: 맞춤형 광고 제공을 위해 Google
                애드센스를 사용합니다. Google은 이용자의 관심사에 기반한 광고를
                제공하기 위해 쿠키를 사용할 수 있습니다. 이용자는{" "}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google 광고 설정
                </a>
                에서 맞춤 광고를 비활성화할 수 있습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. 개인정보의 보유 및 이용 기간</h2>
            <p>
              자동 수집되는 정보는 수집 목적이 달성되면 지체 없이 파기합니다.
              다만, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
          </section>

          <section>
            <h2>5. 개인정보의 제3자 제공</h2>
            <p>
              본 사이트는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만,
              위 3항에 명시된 Google 서비스(GA4, 애드센스)를 통해 익명화된 데이터가
              Google에 전송될 수 있습니다.
            </p>
          </section>

          <section>
            <h2>6. 개인정보의 파기</h2>
            <p>
              수집된 정보의 이용 목적이 달성되면 해당 정보를 지체 없이 파기합니다.
              전자적 파일은 복구 불가능한 방법으로 삭제하며, 종이 문서는
              분쇄하거나 소각합니다.
            </p>
          </section>

          <section>
            <h2>7. 이용자의 권리</h2>
            <p>이용자는 다음의 권리를 행사할 수 있습니다.</p>
            <ul>
              <li>쿠키 수집 거부 (브라우저 설정을 통한 쿠키 비활성화)</li>
              <li>Google 맞춤 광고 비활성화</li>
              <li>
                개인정보 관련 문의 및 불만 처리 요청 (아래 연락처를 통해 문의)
              </li>
            </ul>
          </section>

          <section>
            <h2>8. 개인정보 보호 책임자</h2>
            <ul>
              <li>사이트명: 사주보까 스토리</li>
              <li>웹사이트: sajubokastory.com</li>
              <li>
                문의: 사이트 내 문의 또는{" "}
                <a
                  href="https://www.sajuboka.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  sajuboka.com
                </a>
                을 통해 연락
              </li>
            </ul>
          </section>

          <section>
            <h2>9. 개인정보 처리방침 변경</h2>
            <p>
              본 개인정보 처리방침은 관련 법령 및 사이트 정책 변경에 따라 수정될 수
              있으며, 변경 시 사이트를 통해 공지합니다.
            </p>
          </section>

          <section>
            <h2>부칙</h2>
            <p>본 개인정보 처리방침은 2026년 3월 1일부터 시행합니다.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
