// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Tapacity} from "../src/Tapacity.sol";

contract DeployTapacity is Script {
    function run() external returns (Tapacity game) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        game = new Tapacity();
        vm.stopBroadcast();
        console2.log("TAPACITY_CONTRACT", address(game));
    }
}
