import { Button } from "./ui/button";
import { useGithubAccount } from "@/hooks/use-github-account";
import { IconBrandGithubFilled } from "@tabler/icons-react";

function ConnectGithub() {
  const { githubLinked, isLoading, connectGithub, unlinkGithub } =
    useGithubAccount();
  return (
    <div className="flex items-center gap-3">
      <Button
        variant={githubLinked ? "outline" : "default"}
        className="justify-start border-dashed"
        disabled={githubLinked}
        onClick={connectGithub}
      >
        {githubLinked ? (
          <>
            <IconBrandGithubFilled />
            Connected
          </>
        ) : (
          <>
            <IconBrandGithubFilled />
            Connect GitHub
          </>
        )}
      </Button>
      {githubLinked && (
        <Button
          variant="destructive"
          className="justify-start border-dashed ring-1 ring-inset dark:ring-white/10 ring-black/15"
          onClick={unlinkGithub}
          disabled={isLoading}
        >
          {isLoading ? "Disconnecting…" : "Disconnect GitHub"}
        </Button>
      )}
    </div>
  );
}

export default ConnectGithub;
