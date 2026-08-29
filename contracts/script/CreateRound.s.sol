// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Tapacity} from "../src/Tapacity.sol";

contract CreateRound is Script {
    function run() external returns (uint256 roundId) {
        Tapacity game = Tapacity(vm.envAddress("TAPACITY_CONTRACT"));
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint32 duration = uint32(vm.envOr("ROUND_DURATION_BLOCKS", uint256(50)));
        uint32 reveal = uint32(vm.envOr("ROUND_REVEAL_BLOCKS", uint256(150)));
        uint16 maxPlayers = uint16(vm.envOr("ROUND_MAX_PLAYERS", uint256(15)));
        uint96 tapGrantWei = uint96(vm.envOr("ROUND_TAP_GRANT_WEI", uint256(1 ether)));

        vm.startBroadcast(deployerKey);
        roundId = game.createRound(duration, reveal, maxPlayers, tapGrantWei);
        vm.stopBroadcast();
        console2.log("TAPACITY_ROUND", roundId);
    }
}
