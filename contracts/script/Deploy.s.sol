// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "../src/Jury.sol";

contract DeployScript is Script {
  function run() external returns (Jury jury) {
    vm.startBroadcast();
    jury = new Jury();
    vm.stopBroadcast();
  }
}
