import { callService, useEntity } from '../../../hass/hooks';
import { isAvailable } from '../../../format';

export function MediaPlayerCard({
  entityId,
  label,
}: {
  entityId: string;
  label?: string;
}) {
  const player = useEntity(entityId);
  const name = label ?? player?.attributes.friendly_name ?? entityId;
  const title = (player?.attributes.media_title as string | undefined) ?? '–';
  const artist = player?.attributes.media_artist as string | undefined;
  const playing = player?.state === 'playing';
  const volRaw = player?.attributes.volume_level;
  const volume =
    typeof volRaw === 'number' ? Math.round(volRaw * 100) : undefined;
  const usable = isAvailable(player);

  return (
    <div className="rd-card rd-media">
      <div className="rd-media__head">
        <span className="rd-media__name">{name}</span>
        <button
          className={`rd-media__play ${playing ? 'is-playing' : ''}`}
          disabled={!usable}
          aria-label={playing ? 'Pause' : 'Abspielen'}
          onClick={() =>
            callService('media_player', 'media_play_pause', { entity_id: entityId })
          }
        >
          {playing ? '⏸' : '▶'}
        </button>
      </div>
      <div className="rd-media__track">
        <span className="rd-media__title">{title}</span>
        {artist && <span className="rd-media__artist">{artist}</span>}
      </div>
      {volume !== undefined && (
        <div className="rd-media__vol">
          <span className="rd-media__vol-label">🔊 {volume} %</span>
          <input
            type="range"
            className="rd-slider__input"
            min={0}
            max={100}
            step={1}
            value={volume}
            disabled={!usable}
            onChange={(e) =>
              callService('media_player', 'volume_set', {
                entity_id: entityId,
                volume_level: Number(e.target.value) / 100,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
