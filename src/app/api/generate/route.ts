import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const stylePrompts: Record<string, string> = {
  magical_girl:
    "キラキラした魔法少女アニメ風。大きな瞳、流れる長い髪、リボン・星・ハートの装飾が多め。やわらかく丸みのある線。",
  picture_book:
    "やさしい絵本風。丸みのあるシンプルな線、温かみのある輪郭、細かすぎない描写。",
  american_cartoon:
    "アメリカのアニメ風。丸くてかわいいキャラクター、大きな目と鼻、表情豊か、コミカルなデフォルメ。",
  shonen_manga:
    "少年マンガ風。ダイナミックな構図、スピード感のある線、力強い輪郭線。",
  yurukawa:
    "ゆるかわ風。シンプルな線、まんまるの目、ゆるいデフォルメ、小さくてぷくぷくしたキャラクター。",
  fantasy:
    "中世ヨーロッパのファンタジー風。城・騎士・ドラゴン・魔法使いが似合う、装飾的な模様や紋章。",
};

const difficultyPrompts: Record<number, string> = {
  1: "線の数は10〜15本程度。大きくシンプルな輪郭のみ。塗るエリアを広く取る。背景はなし。",
  2: "線の数は20〜35本。少しだけ細部あり。背景はシンプルなもの1つだけ。",
  3: "線の数は50〜80本。メインキャラクターと簡単な背景。適度なディテール。",
  4: "線の数は100〜130本。細かい模様・表情・背景の書き込みあり。",
  5: "線の数は180本以上。細かいハッチング・複雑な背景・装飾模様。大人向けの複雑さ。",
};

const systemPrompt = `あなたは塗り絵用SVGを生成する専門家です。

必須ルール：
1. 出力はSVGコードのみ。説明文・前置き・コードブロック記号（\`\`\`）は一切含めない
2. SVGは必ず<svg>タグから始まり</svg>タグで終わること
3. 白背景・黒い線のみで描く。使用できる色はblack (#000000) と white (#ffffff) のみ
4. 塗り絵として使えるよう、線は閉じた輪郭線で描く
5. fillは white または none のみ使用。色付きのfillは絶対に使用禁止
6. SVGの属性: width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"
7. 最初の要素として <rect width="500" height="500" fill="white"/> を必ず含める
8. stroke="black" stroke-width="2〜4" を基本とする
9. グラデーション・フィルター・クリップパス・マスクは使用しない
10. テキスト要素は使用しない`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, difficulty = 3, style, referenceImage } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description が入力されていません" },
        { status: 400 }
      );
    }

    const styleInstruction = referenceImage
      ? "添付した画像のスタイル・タッチ・線の雰囲気を参考にして描いてください。"
      : style && stylePrompts[style]
      ? `絵のスタイル: ${stylePrompts[style]}`
      : "スタイルは自由。かわいく親しみやすい塗り絵にしてください。";

    const userPrompt = `以下の条件で塗り絵用のSVGを生成してください。

【描く内容】${description}
【複雑さの指示】${difficultyPrompts[difficulty] ?? difficultyPrompts[3]}
【スタイルの指示】${styleInstruction}

必ずSVGコードのみを出力してください。説明文・コードブロック記号は不要です。`;

    type ImageBlock = {
      type: "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    };
    type TextBlock = { type: "text"; text: string };
    type ContentBlock = ImageBlock | TextBlock;

    const content: ContentBlock[] = [];

    if (referenceImage && typeof referenceImage === "string") {
      const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mediaType = match[1];
        const base64Data = match[2];
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64Data,
          },
        });
      }
    }

    content.push({ type: "text", text: userPrompt });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 16000,
      thinking: {
        type: "enabled",
        budget_tokens: 10000,
      },
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    // thinking ブロックを除いた text ブロックのみ抽出
    const textContent = (response.content as Array<{ type: string; text?: string }>)
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");

    // SVGタグを抽出
    const svgMatch = textContent.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      throw new Error("SVGの生成に失敗しました。もう一度試してください。");
    }

    return NextResponse.json({ svg: svgMatch[0] });
  } catch (error) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "予期しないエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
