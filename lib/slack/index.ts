/**
 * 슬랙 클라이언트
 * - 자료 제출 시 자동으로 채널 생성 (polarad-YYYYMMDD-클라이언트명)
 * - 민감정보(신분증, 통장사본, 사업자등록증)는 서버 저장 없이 슬랙으로만 전송
 * - 일반 파일은 R2 저장 후 슬랙에도 공유
 */

import { WebClient } from "@slack/web-api";
import { toSlackChannelName } from "@/lib/utils/koreanToRoman";

let slackClient: WebClient | null = null;

/**
 * 슬랙 클라이언트 초기화
 */
function initSlackClient(): WebClient | null {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

  if (!SLACK_BOT_TOKEN) {
    console.error("❌ [Slack] SLACK_BOT_TOKEN 환경 변수가 설정되지 않았습니다");
    return null;
  }

  if (!slackClient) {
    try {
      console.log("🔄 [Slack] 클라이언트 초기화 중...");
      slackClient = new WebClient(SLACK_BOT_TOKEN);
      console.log("✅ [Slack] 클라이언트 초기화 완료");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ [Slack] 클라이언트 초기화 실패:", errorMessage);
      return null;
    }
  }
  return slackClient;
}

/**
 * 채널 이름 생성
 * 예: "polarad-20251210-폴라세일즈" → "polarad-20251210-pollaseilseu"
 */
function generateChannelName(clientName: string): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const clientPart = toSlackChannelName(clientName);

  return `polarad-${dateStr}-${clientPart}`.substring(0, 80);
}

/**
 * 이메일로 슬랙 사용자 ID 찾기
 */
async function findUserByEmail(email: string): Promise<string | null> {
  try {
    const client = initSlackClient();
    if (!client || !email) return null;

    const result = await client.users.lookupByEmail({ email });
    return result.user?.id || null;
  } catch (error) {
    console.error("사용자 검색 실패:", error);
    return null;
  }
}

/**
 * 채널 이름으로 채널 ID 찾기
 */
async function findChannelByName(channelName: string): Promise<string | null> {
  try {
    const client = initSlackClient();
    if (!client) return null;

    const result = await client.conversations.list({
      types: "public_channel,private_channel",
      limit: 1000,
    });

    if (!result.ok || !result.channels) return null;

    const channel = result.channels.find((ch) => ch.name === channelName);
    return channel?.id || null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [Slack] 채널 검색 실패:", errorMessage);
    return null;
  }
}

/**
 * 슬랙 채널 생성 (클라이언트 자료 제출용)
 */
export async function createSubmissionChannel(params: {
  clientName: string;
  userName: string;
  userEmail: string;
  userPhone: string;
}): Promise<string | null> {
  try {
    console.log(`🔄 [Slack] 채널 생성 시작`, params);

    const client = initSlackClient();
    if (!client) {
      console.error("❌ [Slack] 클라이언트가 초기화되지 않았습니다");
      return null;
    }

    const channelName = generateChannelName(params.clientName);
    console.log(`🔄 [Slack] 생성할 채널 이름: ${channelName}`);

    // 기존 채널 확인
    const existingChannel = await findChannelByName(channelName);
    if (existingChannel) {
      console.log(`✅ [Slack] 기존 채널 사용: ${channelName} (${existingChannel})`);
      return existingChannel;
    }

    // 새 채널 생성
    const result = await client.conversations.create({
      name: channelName,
      is_private: false,
    });

    if (!result.ok || !result.channel?.id) {
      throw new Error(`채널 생성 실패: ${result.error || "Unknown error"}`);
    }

    const channelId = result.channel.id;

    // 관리자들을 채널에 초대
    const adminEmails = process.env.SLACK_ADMIN_EMAILS;
    const invitedUserIds: string[] = [];

    if (adminEmails) {
      const emails = adminEmails.split(",").map((e) => e.trim());

      for (const email of emails) {
        const userId = await findUserByEmail(email);
        if (userId) {
          try {
            await client.conversations.invite({
              channel: channelId,
              users: userId,
            });
            invitedUserIds.push(userId);
            console.log(`✅ 관리자(${email})를 채널에 초대했습니다`);
          } catch (error) {
            console.error(`관리자(${email}) 초대 실패:`, error);
          }
        }
      }
    }

    // 초기 메시지 전송
    const mentionText = invitedUserIds.length > 0
      ? `\n\n👋 ${invitedUserIds.map((id) => `<@${id}>`).join(" ")} 새로운 클라이언트 자료가 제출되었습니다!`
      : "";

    await postMessage({
      channelId,
      text: `📋 새 클라이언트 자료 제출${mentionText}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📋 새 클라이언트 자료 제출",
          },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*클라이언트명:*\n${params.clientName}` },
            { type: "mrkdwn", text: `*담당자:*\n${params.userName}` },
            { type: "mrkdwn", text: `*연락처:*\n${params.userPhone}` },
            { type: "mrkdwn", text: `*이메일:*\n${params.userEmail}` },
          ],
        },
        ...(invitedUserIds.length > 0
          ? [{
              type: "section" as const,
              text: {
                type: "mrkdwn" as const,
                text: `👋 ${invitedUserIds.map((id) => `<@${id}>`).join(" ")} 새로운 클라이언트 자료가 제출되었습니다!`,
              },
            }]
          : []),
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
            },
          ],
        },
      ],
    });

    console.log(`✅ [Slack] 채널 생성 성공: ${channelName} (${channelId})`);
    return channelId;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [Slack] 채널 생성 실패:", errorMessage);
    return null;
  }
}

/**
 * 슬랙 메시지 전송
 */
export async function postMessage(params: {
  channelId: string;
  text: string;
  blocks?: unknown[];
}): Promise<boolean> {
  try {
    const client = initSlackClient();
    if (!client) return false;

    const result = await client.chat.postMessage({
      channel: params.channelId,
      text: params.text,
      blocks: params.blocks as never[],
    });

    if (!result.ok) throw new Error("메시지 전송 실패");

    console.log(`✅ 슬랙 메시지 전송 성공: ${params.channelId}`);
    return true;
  } catch (error) {
    console.error("슬랙 메시지 전송 실패:", error);
    return false;
  }
}

/**
 * 민감 정보 파일을 버퍼에서 직접 슬랙으로 업로드
 * R2에 저장하지 않고 메모리에서 바로 전송
 */
export async function uploadSensitiveFileToSlack(params: {
  channelId: string;
  buffer: Buffer;
  fileName: string;
  title: string;
  userName?: string;
}): Promise<boolean> {
  try {
    const client = initSlackClient();
    if (!client) {
      console.error("🔐 [Slack] 민감 파일 업로드 실패: 클라이언트 미초기화");
      return false;
    }

    console.log(`🔐 [Slack] 민감 파일 업로드 시작: ${params.title} (${params.buffer.length} bytes)`);

    const result = await client.files.uploadV2({
      channel_id: params.channelId,
      file: params.buffer,
      filename: params.fileName,
      title: params.title,
      initial_comment: `🔐 *${params.title}*${params.userName ? ` - ${params.userName}` : ""}\n_이 파일은 보안을 위해 서버에 저장되지 않습니다_`,
    });

    if (result.ok) {
      console.log(`✅ [Slack] 민감 파일 업로드 성공: ${params.title}`);
      return true;
    } else {
      console.error(`❌ [Slack] 민감 파일 업로드 실패:`, result);
      return false;
    }
  } catch (error) {
    console.error(`❌ [Slack] 민감 파일 업로드 오류:`, error);
    return false;
  }
}

/**
 * R2 URL에서 파일을 다운로드하여 슬랙에 업로드
 */
export async function uploadFileToSlackFromUrl(params: {
  channelId: string;
  fileUrl: string;
  fileName: string;
  title: string;
}): Promise<boolean> {
  try {
    const client = initSlackClient();
    if (!client) return false;

    console.log(`📤 [Slack] URL에서 파일 업로드: ${params.fileUrl}`);

    // R2에서 파일 다운로드
    const response = await fetch(params.fileUrl);
    if (!response.ok) {
      console.error(`R2 파일 다운로드 실패: ${response.status}`);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);

    // URL에서 확장자 추출
    const urlPath = new URL(params.fileUrl).pathname;
    const actualExtension = urlPath.split('.').pop() || 'bin';
    const baseFileName = params.fileName.replace(/\.[^/.]+$/, "");
    const finalFileName = `${baseFileName}.${actualExtension}`;

    const result = await client.files.uploadV2({
      channel_id: params.channelId,
      file: fileContent,
      filename: finalFileName,
      title: params.title,
      initial_comment: `📎 ${params.title}`,
    });

    if (result.ok) {
      console.log(`✅ 파일 업로드 성공: ${params.title}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`파일 업로드 오류: ${params.title}`, error);
    return false;
  }
}

/**
 * 제출 정보 전체를 슬랙 채널에 전송
 */
export async function pushSubmissionToSlack(params: {
  channelId: string;
  submissionData: {
    brandName?: string;
    contactEmail?: string;
    contactPhone?: string;
    deliveryAddress?: string;
    websiteStyle?: string;
    websiteColor?: string;
    blogDesignNote?: string;
    additionalNote?: string;
  };
}): Promise<boolean> {
  const { channelId, submissionData } = params;

  const fields: { type: string; text: string }[] = [];

  const textFields = [
    { key: "brandName", label: "브랜드명" },
    { key: "contactEmail", label: "이메일" },
    { key: "contactPhone", label: "연락처" },
    { key: "deliveryAddress", label: "배송 주소" },
    { key: "websiteStyle", label: "웹사이트 스타일" },
    { key: "websiteColor", label: "브랜드 컬러" },
  ];

  textFields.forEach(({ key, label }) => {
    const value = submissionData[key as keyof typeof submissionData];
    if (value) {
      fields.push({ type: "mrkdwn", text: `*${label}:*\n${value}` });
    }
  });

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "📋 제출 정보" },
    },
    {
      type: "section",
      fields,
    },
  ];

  // 블로그 디자인 요청사항 (긴 텍스트)
  if (submissionData.blogDesignNote) {
    blocks.push(
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🎨 블로그 디자인 요청사항:*\n${submissionData.blogDesignNote}`,
        },
      }
    );
  }

  // 추가 요청사항
  if (submissionData.additionalNote) {
    blocks.push(
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📝 추가 요청사항:*\n${submissionData.additionalNote}`,
        },
      }
    );
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
      },
    ],
  });

  return postMessage({ channelId, text: "📋 제출 정보", blocks });
}

export default {
  createSubmissionChannel,
  postMessage,
  uploadSensitiveFileToSlack,
  uploadFileToSlackFromUrl,
  pushSubmissionToSlack,
};
