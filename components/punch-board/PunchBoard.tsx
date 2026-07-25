import { TeamHeader } from "./TeamHeader";
import { HeatmapGrid } from "./HeatmapGrid";
import { ActivityStream } from "./ActivityStream";

export function PunchBoard() {
  return (
    <section
      className="punch-board-shell punch-scene absolute inset-0 flex flex-col gap-4 transition-opacity duration-300"
      aria-label="健身打卡训练室"
    >
      <div className="punch-scene-background" aria-hidden="true">
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_gym_wall_bg.webp"
          alt=""
          className="punch-scene-wall"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_gym_floor_strip.webp"
          alt=""
          className="punch-scene-floor"
        />
      </div>
      <div className="punch-scene-props" aria-hidden="true">
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_poster_no_pain.webp"
          alt=""
          className="punch-scene-poster punch-scene-poster-left"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_poster_believe.webp"
          alt=""
          className="punch-scene-poster punch-scene-poster-right"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_stopwatch_keep_going.webp"
          alt=""
          className="punch-scene-stopwatch"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_dumbbell_corner.webp"
          alt=""
          className="punch-scene-dumbbell"
        />
        <img
          src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_towel_bar.webp"
          alt=""
          className="punch-scene-towel"
        />
      </div>
      <div className="punch-scene-content relative z-10 flex min-h-0 flex-1 flex-col gap-4">
        <TeamHeader />
        <HeatmapGrid />
        <ActivityStream />
      </div>
    </section>
  );
}
