import { Module } from '@danet/core';
import { AniListModule } from './anilist/anilist.module.ts';
import { ArmModule } from './arm/arm.module.ts';
import { JikanModule } from './jikan/jikan.module.ts';
import { OtakumodeModule } from './otakumode/otakumode.module.ts';
import { NotifyModule } from './notify/notify.module.ts';
import { SkyhookModule } from './skyhook/skyhook.module.ts';
import { TheXemModule } from './thexem/thexem.module.ts';
import { ThemeModule } from './theme/theme.module.ts';
import { TmdbModule } from './tmdb/tmdb.module.ts';
import { TraktModule } from './trakt/trakt.module.ts';

@Module({
  imports: [
    AniListModule,
    ArmModule,
    JikanModule,
    OtakumodeModule,
    NotifyModule,
    SkyhookModule,
    TheXemModule,
    ThemeModule,
    TmdbModule,
    TraktModule,
  ],
})
export class ServiceModule { }
