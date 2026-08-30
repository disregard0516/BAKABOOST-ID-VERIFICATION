export function formatDateTime(
  value: string,
): string {
  const date = new Date(value);

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function getTimeRemaining(
  value: string,
): string {
  const target = new Date(value).getTime();
  const now = Date.now();

  const difference =
    target - now;

  if (difference <= 0) {
    return "Expired";
  }

  const minutes = Math.floor(
    difference / 60_000,
  );

  if (minutes < 60) {
    return `${minutes}m remaining`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours}h remaining`;
  }

  const days = Math.floor(
    hours / 24,
  );

  return `${days}d remaining`;
}

export function formatWaitingDuration(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const started =
    new Date(value).getTime();

  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() - started) /
        1000,
    ),
  );

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(
      seconds / 60,
    );

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainingMinutes =
    minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  return `${days}d ${hours % 24}h`;
}