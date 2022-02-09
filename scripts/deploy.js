const { expect, assert } = require("chai");
const { providers } = require("ethers");
const { ethers, upgrades, network } = require("hardhat");

const addr_router_original_bscmainnet = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const addr_router_original_bsctestnet = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
const abi_router_original = require("../abi_pancakeRouter_original.json");

//const OWNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER_PRIVATE_KEY = "93e75eb04d3251b2b9b82ef4b75bffa4c41961c6b586ab24ab057549d0b96146";

var exchangeRouter ;
var exchangeFactory;
var wETH;

var pledgeToken;
var owner;

async function main() {
	var private_key, provider;

	if (['hardhat', 'localnet', 'fantomtestnet', 'bsctestnet'].includes(network.name)) {
		owner = await ethers.getSigner();

	// } else if(network.name == 'bsctestnet' ) {
	// 	// private_key = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
	// 	provider = new ethers.providers.JsonRpcProvider("http://185.25.48.34/api/v10/rpc/bsc-test");
	// 	// owner = new ethers.Wallet(private_key, provider);
	// 	owner = await ethers.getSigner(provider);

	} else if(network.name == 'bscmainnet' ) {
		private_key = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Replace. Fund with BNBs.
		provider = new ethers.providers.JsonRpcProvider("https://dataseed1.binance.org/");
		owner = new ethers.Wallet(private_key, provider);
	} else {
		console.log("\tWrong network.");
		exit();
	}
	console.log("\towner's address = %s.", await owner.getAddress());

	if (network.name == 'bsctestnet') {
	console.log("\n\tWe choose to use the original PancakeRouter deployed on the bsctestnet, at: ", addr_router_original_bsctestnet);
	exchangeRouter = new ethers.Contract(addr_router_original_bsctestnet,  abi_router_original, owner);
	
	} else if (network.name == 'bscmainnet') { // This is NOT tested.
		private_key = "";
		console.log("\n\tWe choose to use the original PancakeRouter deployed on the bscmainnet, at: ", addr_router_original_bscmainnet);
		exchangeRouter = new ethers.Contract(addr_router_original_bscmainnet,  abi_router_original, owner);
	
	} else if ( ['fantomtestnet', 'localnet', 'hardhat'].includes(network.name) ) {
		console.log("\n\tWe choose to deploy a new clone of PancakeRouter");
		try {
			const Factory = await ethers.getContractFactory("PancakeFactory", owner);
			exchangeFactory = await Factory.deploy(owner.address);
			await exchangeFactory.deployed();
			console.log("\n\t!!! exchangeFactory.INIT_CODE_PAIR_HASH() = ", (await exchangeFactory.INIT_CODE_PAIR_HASH()).substring(2) ); 
			console.log("\t!!! Please make sure the pairFor(...) function of PancakeRouter.sol file has the same code in its source code.");
		} catch(err) {
			assert.fail('PancakeswapFactory contract was not created');
		}
		try {
			const WETH = await ethers.getContractFactory("WETH9", owner);
			wETH = await WETH.deploy();
			await wETH.deployed();
		} catch(err) {
			assert.fail('WETH9 contract was not created');
		}
		try {
			const Router = await ethers.getContractFactory("PancakeRouter", owner);
			exchangeRouter = await Router.deploy(exchangeFactory.address, wETH.address);
			await exchangeRouter.deployed();
		} catch(err) {
			assert.fail('pancakeRouter contract was not created');
		}
		
	} else {
		console.log("network should be one of hardhat, localnet, fantomtestnet, bsctestnet, and bscmainnet, not ".yellow, network.name.bgYellow);
		throw 'network unacceptable.'
	}

	const contractName = 'Pledge07Up'; // Put the name of the contract that you want to deploy.

	const PledgeToken = await ethers.getContractFactory(contractName, owner);
	pledgeToken = await upgrades.deployProxy(PledgeToken, [], {initializer: 'initialize()'});
	await pledgeToken.deployed();

	console.log("\n\tAn upgradeable initial contract %s of Pledge token deployed to: ".green, contractName, pledgeToken.address.bgRed);
	console.log("\t!!! Please copy this address to the variable 'addr_previouse_upgradeable_contract' in the 'scripts/upgrades.js' file,");
	console.log("\tbefore running the script.");

	beneficiaries = {
		marketing: process.env.MARKETINGADDRESS,
		charity: process.env.CHARITYADDRESS,
		liquidity: pledgeToken.address,
		lottery: process.env.LOTTERYADDRESS
	};
	console.log("\tsetBenefitiaries(...).");
	tx = await pledgeToken.setBeneficiaries(beneficiaries);
	await tx.wait();

	console.log("\tsetGeneralCharityAddress(...).");
	tx = await pledgeToken.setGeneralCharityAddress(process.env.CHARITYADDRESS);
	
	console.log("\tcreateLiquidityPool(...).");
	var tx = await pledgeToken.createLiquidityPool(exchangeRouter.address);
}

main().then(() => {
	console.log("\n\tAn upgradeable contract of Pledge token is now deployed and initialized.".yellow);
	console.log("\tYou are ready to all apps, on-chain or off-chain, to collaborate this contract.".yellow);
})
.catch((error) => {
	console.error(error);
	process.exit(1);
});

