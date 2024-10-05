import React from "react";

//import Link from "next/link";
//import { hardhat } from "viem/chains";
//import { CurrencyDollarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
//import { HeartIcon } from "@heroicons/react/24/outline";
//import { SwitchTheme } from "~~/components/SwitchTheme";
//import { BuidlGuidlLogo } from "~~/components/assets/BuidlGuidlLogo";
//import { Faucet } from "~~/components/scaffold-eth";
//import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
//import { useGlobalState } from "~~/services/store/store";

/**
 * Site footer
 */
export const Footer = () => {
  //const nativeCurrencyPrice = useGlobalState(state => state.nativeCurrency.price);
  //const { targetNetwork } = useTargetNetwork();
  //const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="text-center">
              <a href="https://t.me/vtikhoniuk" target="_blank" rel="noreferrer" className="link">
                Contact us
              </a>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
};
