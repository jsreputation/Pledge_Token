const { expect, assert } = require("chai");
const { ethers, upgrades, network } = require("hardhat");

// const abi_erc20 = require("../artifacts/contracts/PancakeFactory.sol/IERC20.json").abi;

// const addr_router_original = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
// const abi_router_original = require("../abi_pancakeRouter_original.json");

// const addr_router_clone = '0x2c98dED58e4219A59A40AB57E8bb34686946EF4E';
// const abi_router_clone = require("../artifacts/contracts/PancakeRouter.sol/PancakeRouter.json").abi;

const addr_previouse_upgradeable_contract = '0xF0B9Ee6b5234fe42D1c231D88fb8DF0311B04Fa6';

var pledgeToken;
var owner;

async function main() {

	var private_key, provider;

	if (['hardhat', 'localnet', 'fantomtestnet', 'bsctestnet'].includes(network.name)) {
		owner = await ethers.getSigner();

	} else if(network.name == 'bscmainnet' ) {
		private_key = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Replace. Fund with BNBs.
		provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
		owner = new ethers.Wallet(private_key, provider);

	} else {
		console.log("\tWrong network.");
		exit();
	}
	console.log("\towner's address = %s.", await owner.getAddress());
	
	const PledgeToken = await ethers.getContractFactory("Pledge08Up", owner);
	pledgeToken = await upgrades.upgradeProxy(addr_previouse_upgradeable_contract, PledgeToken);
	await pledgeToken.deployed();

	assert(addr_previouse_upgradeable_contract == pledgeToken.address);
	console.log("\n\tThe existing contract of Pledge token has been upgraded to another at the same address: ".green, pledgeToken.address);
}

main().then(() => {
	console.log("\n\tThe upgradeable contract of PledgeToken, was now upgraded to another upgradeable contract.".yellow);
	console.log("\tYou can keep running all apps, as are, that were interoperating with the contract.".yellow)
})
.catch((error) => {
	console.error(error);
	process.exit(1);
});
