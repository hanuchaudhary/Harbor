import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export default function UserAvatar({
  src,
  alt,
  size = "default",
}: {
  src: string;
  alt: string;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <Avatar size={size}>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{alt ? alt.charAt(0).toUpperCase() : "U"}</AvatarFallback>
    </Avatar>
  );
}
