export default function Disclaimer() {
    return (
        <div className="my-8 p-5 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30">
            <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">ℹ️</span>
                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        <strong>이 글은 일반적인 운세·사주 정보 제공 목적입니다</strong>
                        <p className="mt-1">
                            전통 명리학 이론을 바탕으로 작성했으며, 과학적으로 검증된 예측이 아닙니다.
                            중요한 결정은 반드시 본인의 판단과 전문가 상담을 통해 이루어져야 합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
