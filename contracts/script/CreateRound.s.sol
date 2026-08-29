// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Tapacity} from "../src/Tapacity.sol";

contract CreateRound is Script {
    function run() external returns (uint256 roundId) {
        Tapacity game = Tapacity(vm.envAddress("TAPACITY_CONTRACT"));
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint64 startBlock = uint64(block.number + vm.envOr("ROUND_START_DELAY_BLOCKS", uint256(25)));
        uint32 duration = uint32(vm.envOr("ROUND_DURATION_BLOCKS", uint256(50)));
        uint32 reveal = uint32(vm.envOr("ROUND_REVEAL_BLOCKS", uint256(25)));
        uint16 maxPlayers = uint16(vm.envOr("ROUND_MAX_PLAYERS", uint256(15)));

        vm.startBroadcast(deployerKey);
        roundId = game.createRound(startBlock, duration, reveal, maxPlayers);
        vm.stopBroadcast();
        console2.log("TAPACITY_ROUND", roundId);
        console2.log("START_BLOCK", startBlock);
    }
}
