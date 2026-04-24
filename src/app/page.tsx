"use client";

import { useState, useRef } from "react";

const STYLE_OPTIONS = [
  { id: "magical_girl", emoji: "🌸", label: "キラキラ魔法少女風" },
  { id: "picture_book", emoji: "📚", label: "やさしい絵本風" },
  { id: "american_cartoon", emoji: "🐭", label: "まるくてかわいいアメリカンカートゥーン風" },
  { id: "shonen_manga", emoji: "✏️", label: "かっこいい少年マンガ風" },
  { id: "yurukawa", emoji: "🌈", label: "ゆるくてかわいいゆるかわ風" },
  { id: "fantasy", emoji: "🏰", label: "中世ヨーロッパのファンタジー風" },
];

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "かんたん 😊",
  2: "すこしかんたん 🌱",
  3: "ふつう 🌟",
  4: "むずかしい 💪",
  5: "とってもむずかしい 🔥",
};

export default function Home() {
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(3);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStyleSelect = (styleId: string) => {
    if (selectedStyle === styleId) {
      setSelectedStyle(null);
    } else {
      setSelectedStyle(styleId);
      setReferenceImage(null);
      setReferenceImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setReferenceImage(dataUrl);
      setReferenceImagePreview(dataUrl);
      setSelectedStyle(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          difficulty,
          style: selectedStyle || undefined,
          referenceImage: referenceImage || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "エラーが発生しました");
      }

      const data = await res.json();
      setResult(data.svg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSVG = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nurie.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 0, 0, 600, 600);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "nurie.png";
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-black text-purple-600 mb-2 drop-shadow-sm">
            ぬりえメーカー 🎨
          </h1>
          <p className="text-xl text-pink-500 font-bold">すきなぬりえをつくろう！</p>
        </header>

        {/* ローディング */}
        {isLoading && (
          <div className="bg-white rounded-3xl shadow-lg p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
            <p className="text-2xl font-bold text-purple-600 mb-3">
              ぬりえをかんがえています... 🖊️
            </p>
            <p className="text-lg text-gray-500">
              30びょう〜1ぷんくらいかかるよ。まってね！
            </p>
          </div>
        )}

        {/* 結果表示 */}
        {result && !isLoading && (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-center text-purple-600 mb-4">
              できたよ！🎉
            </h2>
            <div
              className="border-2 border-gray-200 rounded-2xl overflow-hidden mx-auto mb-6 bg-white"
              style={{ maxWidth: "600px" }}
              dangerouslySetInnerHTML={{ __html: result }}
            />
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <button
                onClick={downloadSVG}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg py-4 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg"
              >
                SVGでダウンロード 📥
              </button>
              <button
                onClick={downloadPNG}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold text-lg py-4 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg"
              >
                PNGでダウンロード 🖼️
              </button>
            </div>
            <button
              onClick={handleReset}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-lg py-4 px-6 rounded-2xl transition-colors"
            >
              もう一度つくる 🔄
            </button>
          </div>
        )}

        {/* 入力フォーム */}
        {!isLoading && !result && (
          <div className="bg-white rounded-3xl shadow-lg p-6 space-y-7">
            {/* エラー表示 */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-600 font-bold text-lg">
                ⚠️ {error}
              </div>
            )}

            {/* ① なにを描く？ */}
            <div>
              <label className="block text-xl font-black text-gray-700 mb-3">
                ① なにを描く？{" "}
                <span className="text-red-500 font-bold text-base">（ひつよう）</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例：ハムスターがチョコレート工場ではたらいているところ"
                className="w-full border-2 border-gray-200 focus:border-purple-400 rounded-2xl p-4 resize-none outline-none transition-colors"
                rows={3}
                style={{ fontSize: "18px", lineHeight: "1.6" }}
              />
            </div>

            {/* ② むずかしさ */}
            <div>
              <label className="block text-xl font-black text-gray-700 mb-3">
                ② むずかしさ
              </label>
              <div className="text-center text-2xl font-black text-purple-600 mb-4">
                {DIFFICULTY_LABELS[difficulty]}
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2 px-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`font-bold text-base ${difficulty === n ? "text-purple-600" : ""}`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {/* ③ えのスタイル */}
            <div>
              <label className="block text-xl font-black text-gray-700 mb-3">
                ③ えのスタイルを選ぼう{" "}
                <span className="text-gray-400 font-normal text-base">
                  （えらばなくてもOK）
                </span>
              </label>

              {/* プリセットボタン */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleSelect(style.id)}
                    className={`border-2 rounded-2xl p-3 text-left transition-all ${
                      selectedStyle === style.id
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/30"
                    }`}
                  >
                    <div className="text-2xl mb-1">{style.emoji}</div>
                    <div
                      className={`text-sm font-bold leading-tight ${
                        selectedStyle === style.id ? "text-purple-700" : "text-gray-700"
                      }`}
                    >
                      {style.label}
                    </div>
                  </button>
                ))}
              </div>

              {/* 画像アップロード */}
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4">
                <p className="text-base font-bold text-gray-600 mb-3">
                  参考にしたい絵をアップしてね！
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 text-white font-bold py-2 px-5 rounded-xl text-base transition-all shadow-sm hover:shadow-md"
                >
                  この絵のスタイルで作る 📸
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {referenceImagePreview && (
                  <div className="mt-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={referenceImagePreview}
                      alt="参考画像"
                      className="w-20 h-20 object-cover rounded-xl border-2 border-orange-300"
                    />
                    <div>
                      <p className="text-sm font-bold text-orange-600">
                        この画像のスタイルで作るよ！
                      </p>
                      <button
                        onClick={() => {
                          setReferenceImage(null);
                          setReferenceImagePreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-sm text-red-400 hover:text-red-600 mt-1"
                      >
                        ✕ とりけす
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ④ 生成ボタン */}
            <button
              onClick={handleGenerate}
              disabled={!description.trim()}
              className={`w-full py-5 text-2xl font-black rounded-3xl transition-all ${
                description.trim()
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              ぬりえをつくる！🎨
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
