import { Component, Input } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { GlobalVarsService } from '../global-vars.service';
import {
  BackendApiService,
  NFTEntryResponse,
  PostEntryResponse,
} from '../backend-api.service';
import { concatMap, last, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'create-nft-auction',
  templateUrl: './create-nft-auction-modal.component.html',
})
export class CreateNftAuctionModalComponent {
  @Input() postHashHex: string;
  @Input() post: PostEntryResponse;
  @Input() nftEntryResponses: NFTEntryResponse[];
  loading = false;
  minBidAmountUSD: string = '0';
  minBidAmountDESO: number = 0;
  selectedSerialNumbers: boolean[] = [];
  selectAll: boolean = false;
  creatingAuction: boolean = false;
  isBuyNow: boolean = false;
  buyNowPriceUSD: string = '0';
  buyNowPriceDESO: number = 0;

  constructor(
    private backendApi: BackendApiService,
    public globalVars: GlobalVarsService,
    public bsModalRef: BsModalRef,
    private modalService: BsModalService,
    private router: Router
  ) {}

  updateMinBidAmountUSD(desoAmount) {
    this.minBidAmountUSD = this.globalVars
      .nanosToUSDNumber(desoAmount * 1e9)
      .toFixed(2);
  }

  updateMinBidAmountDESO(usdAmount) {
    this.minBidAmountDESO =
      Math.trunc(this.globalVars.usdToNanosNumber(usdAmount)) / 1e9;
  }

  updateBuyNowPriceUSD(desoAmount): void {
    this.buyNowPriceUSD = this.globalVars
      .nanosToUSDNumber(desoAmount * 1e9)
      .toFixed(2);
  }

  updateBuyNowPriceDESO(usdAmount): void {
    this.buyNowPriceDESO =
      Math.trunc(this.globalVars.usdToNanosNumber(usdAmount)) / 1e9;
  }

  updateBuyNowStatus(isBuyNow: boolean): void {
    if (!isBuyNow) {
      this.buyNowPriceDESO = 0;
      this.buyNowPriceUSD = '0';
    }
  }

  auctionTotal: number;
  auctionCounter: number = 0;
  createAuction() {
    this.auctionTotal = this.selectedSerialNumbers.filter((res) => res).length;
    this.creatingAuction = true;
    of(
      ...this.selectedSerialNumbers.map((isSelected, index) =>
        isSelected ? index : -1
      )
    )
      .pipe(
        concatMap((val) => {
          if (val >= 0) {
            return this.backendApi
              .UpdateNFT(
                this.globalVars.localNode,
                this.globalVars.loggedInUser.PublicKeyBase58Check,
                this.post.PostHashHex,
                val,
                true,
                Math.trunc(this.minBidAmountDESO * 1e9),
                this.isBuyNow,
                Math.trunc(this.buyNowPriceDESO * 1e9),
                this.globalVars.defaultFeeRateNanosPerKB
              )
              .pipe(
                map((res) => {
                  this.auctionCounter++;
                  return res;
                })
              );
          } else {
            return of('');
          }
        })
      )
      .pipe(last((res) => res))
      .subscribe(
        (res) => {
          this.router.navigate([
            '/' + this.globalVars.RouteNames.NFT + '/' + this.post.PostHashHex,
          ]);
          this.modalService.setDismissReason('auction created');
          this.bsModalRef.hide();
        },
        (err) => {
          console.error(err);
          this.globalVars._alertError(this.backendApi.parseMessageError(err));
        }
      )
      .add(() => (this.creatingAuction = false));
  }

  mySerialNumbersNotForSale(): NFTEntryResponse[] {
    return this.nftEntryResponses.filter(
      (nftEntryResponse) =>
        !nftEntryResponse.IsForSale &&
        !nftEntryResponse.IsPending &&
        nftEntryResponse.OwnerPublicKeyBase58Check ===
          this.globalVars.loggedInUser?.PublicKeyBase58Check
    );
  }

  toggleSelectAll(val: boolean) {
    this.mySerialNumbersNotForSale().forEach(
      (nftEntryResponse) =>
        (this.selectedSerialNumbers[nftEntryResponse.SerialNumber] = val)
    );
  }

  createAuctionDisabled(): boolean {
    return (
      !this.selectedSerialNumbers.filter((isSelected) => isSelected)?.length ||
      (this.isBuyNow && this.buyNowPriceDESO < this.minBidAmountDESO)
    );
  }

  selectSerialNumber(idx: number): void {
    this.selectAll = false;
    for (let ii = 0; ii < this.selectedSerialNumbers.length; ii++) {
      this.selectedSerialNumbers[ii] = ii === idx;
    }
  }
}
