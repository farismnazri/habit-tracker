import { iconSrcForKey } from '@/lib/icon-catalog';
import type { MissionRecord } from '@/types/habit';

type MissionIconProps = {
  mission: Pick<MissionRecord, 'name' | 'icon_key' | 'color_hex' | 'is_archived'>;
  size?: 'sm' | 'md';
  muted?: boolean;
};

export function MissionIcon({ mission, size = 'sm', muted }: MissionIconProps) {
  const dim = size === 'md' ? 'h-8 w-8' : 'h-5 w-5';
  const opacity = muted || mission.is_archived ? 'opacity-45' : 'opacity-100';

  return (
    <span
      role="img"
      aria-label={mission.name}
      title={`${mission.name} (${mission.icon_key})`}
      className={`${dim} ${opacity} inline-flex items-center justify-center rounded-md border border-line bg-canvas shadow-sm`}
    >
      <img
        src={iconSrcForKey(mission.icon_key)}
        alt=""
        aria-hidden="true"
        className="h-full w-full rounded-[inherit] object-contain"
        draggable={false}
      />
    </span>
  );
}
