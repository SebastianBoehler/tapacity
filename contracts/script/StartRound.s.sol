// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Tapacity} from "../src/Tapacity.sol";

contract StartRound is Script {
    function run() external {
        Tapacity game = Tapacity(vm.envAddress("TAPACITY_CONTRACT"));
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 roundId = vm.envUint("TAPACITY_ROUND");
        uint32 leadBlocks = uint32(vm.envOr("ROUND_START_LEAD_BLOCKS", uint256(15)));
        vm.startBroadcast(deployerKey);
        game.startRound(roundId, leadBlocks);
        vm.stopBroadcast();

        Tapacity.Round memory round = game.getRound(roundId);
        console2.log("TAPACITY_ROUND", roundId);
        console2.log("JOINED_PLAYERS", round.playerCount);
        console2.log("START_BLOCK", round.startBlock);
    }
}
