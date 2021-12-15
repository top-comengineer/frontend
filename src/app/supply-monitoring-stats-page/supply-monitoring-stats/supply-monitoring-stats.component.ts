import { Component, OnDestroy } from "@angular/core";
import { BackendApiService, ProfileEntryResponse, RichListEntryResponse } from "../../backend-api.service";
import { GlobalVarsService } from "../../global-vars.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { RouteNames, AppRoutingModule } from "../../app-routing.module";
import { CanPublicKeyFollowTargetPublicKeyHelper } from "../../../lib/helpers/follows/can_public_key_follow_target_public_key_helper";
import { Datasource, IAdapter, IDatasource } from "ngx-ui-scroll";
import { InfiniteScroller } from "src/app/infinite-scroller";

@Component({
  selector: "supply-monitoring-stats",
  templateUrl: "./supply-monitoring-stats.component.html",
  styleUrls: ["./supply-monitoring-stats.component.scss"],
})
export class SupplyMonitoringStatsComponent {
  static BUFFER_SIZE = 10;
  static PAGE_SIZE = 10;
  static WINDOW_VIEWPORT = true;
  totalSupplyDESO: number;
  loadingTotalSupply: boolean = true;
  richList: RichListEntryResponse[];
  loadingRichList: boolean = true;
  datasource: IDatasource<IAdapter<any>> = this.getDatasource();
  constructor(public globalVars: GlobalVarsService, private backendApi: BackendApiService) {
    this.backendApi
      .GetRichList(this.globalVars.localNode)
      .subscribe((res) => {
        this.richList = res || [];
      })
      .add(() => (this.loadingRichList = false));
    this.backendApi
      .GetTotalSupply(this.globalVars.localNode)
      .subscribe((res) => {
        this.totalSupplyDESO = res;
      })
      .add(() => (this.loadingTotalSupply = false));
  }

  getDatasource(): IDatasource<IAdapter<any>> {
    return new Datasource<IAdapter>({
      get: (index, count, success) => {
        const startIdx = Math.max(index, 0);
        const endIdx = index + count - 1;
        if (startIdx > endIdx) {
          success([]);
          return;
        }
        if (endIdx + 1 > this.richList.length) {
          success(this.richList.slice(startIdx, this.richList.length) as any[]);
          return;
        }
        success(this.richList.slice(startIdx, endIdx + 1) as any[]);
        return;
      },
      settings: {
        startIndex: 0,
        minIndex: 0,
        bufferSize: 5,
        padding: 0.5,
        windowViewport: true,
        infinite: true,
      },
    });
  }
}
