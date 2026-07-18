import ChannelChat from "@/screens/channel/channel-chat";

export default async function page({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  return <ChannelChat channelId={channelId} />;
}
