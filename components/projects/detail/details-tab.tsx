interface DetailsTabProps {
  data: {
    description: string | null;
    budget: string | null;
    currency: string;
    startDate: string | null;
    estimatedEndAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    repos: Array<{
      id: string;
      name: string;
      url: string;
    }>;
  };
}

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

export function DetailsTab({ data }: DetailsTabProps) {
  return (
    <div className="space-y-8">
      {data.description && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </h2>
          <p className="text-sm leading-relaxed">{data.description}</p>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Project Info
        </h2>
        <div className="border divide-y">
          {[
            {
              label: "Budget",
              value: data.budget
                ? `${data.currency} ${Number(data.budget).toLocaleString()}`
                : null,
            },
            { label: "Start Date", value: formatDate(data.startDate) },
            {
              label: "Estimated End",
              value: formatDate(data.estimatedEndAt),
            },
            { label: "Completed", value: formatDate(data.completedAt) },
            { label: "Created", value: formatDate(data.createdAt) },
            { label: "Last Updated", value: formatDate(data.updatedAt) },
          ]
            .filter(({ value }) => value)
            .map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
        </div>
      </div>

      {data.repos && data.repos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Repositories ({data.repos.length})
          </h2>
          <div className="flex flex-col gap-2">
            {data.repos.map((repo) => (
              <div key={repo.id} className="flex items-center">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-xs font-semibold"
                >
                  <img
                    src="/github.svg"
                    alt="GitHub"
                    className="w-4 h-4 inline-block mr-1 dark:invert"
                  />
                  {repo.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
