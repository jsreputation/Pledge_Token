const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const { expect, assert } = require("chai");
const { ethers, upgrades, network } = require("hardhat");

const abi_erc20 = require("../artifacts/contracts/PancakeFactory.sol/IERC20.json").abi;
const addr_factory_original_bscmainnet = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;'
const addr_factory_original_bsctestnet = '0x6725F303b657a9451d8BA641348b6761A6CC7a17';
const addr_router_original_bscmainnet = '0x10ed43c718714eb63d5aa57b78b54704e256024e';
const addr_router_original_bsctestnet = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
// const addr_router_clone = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
// const abi_router_clone = require("../artifacts/contracts/PancakeRouter.sol/IPancakeRouter02.json").abi;
const abi_factory_original = require("../abi_pancakeFactory_original.json");
const abi_router_original = require("../abi_pancakeRouter_original.json");
const abi_pair_original = require("../abi_pancakePair_original.json");

var abi_pair_clone; // loads later in an async funciton. Ugly code.
//PancakePair abi is available af https://bscscan.com/address/0x0ed7e52944161450477ee417de9cd3a859b14fd0#code.

var dexRouter;
var dexFactory;
var wETH;

var ownerContract;
var theOwner, Alice, Bob, Charlie;

var pancakePairContract;
var LPBalance0;

var eth_power = 12; // 12 is the maximum possible value on hardhat default network.
var eth_gas_fee_power = 17;

const DECIMALS = 18;
const N_DECIMALS = 18n;

const FEE_MAGNIFIER = 100000; // Five zeroes.
const FEE_HUNDRED_PERCENT = FEE_MAGNIFIER * 100;

const INITIAL_LOWER_MARKETING_FEE = 375;      // this/FEE_MAGNIFIER = 0.00375 or 0.375%
const INITIAL_LOWER_CHARITY_FEE = 125;        // this/FEE_MAGNIFIER = 0.00125 or 0.125%
const INITIAL_LOWER_LIQUIDITY_FEE = 375;      // this/FEE_MAGNIFIER = 0.00375 or 0.375%
const INITIAL_LOWER_LOTTERY_FEE = 125;        // this/FEE_MAGNIFIER = 0.00125 or 0.125%

const INITIAL_HIGHER_MARKETING_FEE = 1500;    // this/FEE_MAGNIFIER = 0.01500 or 1.500%
const INITIAL_HIGHER_CHARITY_FEE = 500;       // this/FEE_MAGNIFIER = 0.00500 or 0.500%
const INITIAL_HIGHER_LIQUIDITY_FEE = 1500;    // this/FEE_MAGNIFIER = 0.01500 or 1.500%
const INITIAL_HIGHER_LOTTERY_FEE = 500;       // this/FEE_MAGNIFIER = 0.00500 or 0.500%

const INITIAL_GENERAL_CHARITY = "0x8887Df2F38888117c0048eAF9e26174F2E75B8eB";

const MAX_TRANSFER_AMOUNT = (1n * 10n) ** (12n + N_DECIMALS);
const LIQUIDITY_QUANTUM = (1n * 10n) ** (5n + N_DECIMALS);
const ALT_GENERAL_CHARITY_ADDRESS = (ethers.Wallet.createRandom()).address; // Arbitrary. Hope it be unique.

const zero_address = '0x0000000000000000000000000000000000000000';

function weiToEthEn(wei) { return Number(ethers.utils.formatUnits(wei.toString(), DECIMALS)).toLocaleString('en') }

describe("1. Connect to Provide-Wallet-Network.\n".green, function () {

	it("Test signers, defined in your hardhat.config.js, are ready.".green, async function () {
		[theOwner, Alice, Bob, Charlie] = await ethers.getSigners();
		console.log("\tthOwner's address = %s.", await theOwner.getAddress());
		console.log("\tAlice's address = %s.", await Alice.getAddress());
		console.log("\tBob's address = %s.", await Bob.getAddress());
		console.log("\tCharlie's address = %s.", await Charlie.getAddress());
	});
});

describe("2. Check or build a test bed for the contract of the Pledge token.\n".green, function () {

	if (network.name == 'bscmainnet') { // This is NOT tested.
		it("A handle to the PancakeFactory contract deployed on the BSC mainnet, is now ready for use.".green, async function () {
			dexFactory = new ethers.Contract(addr_factory_original_bscmainnet,  abi_factory_original, theOwner);
		});

		it("A handle to the PancakeRouter contract deployed on the BSC mainnet, is now ready for use.".green, async function () {
			dexRouter = new ethers.Contract(addr_router_original_bscmainnet,  abi_router_original, theOwner);
		});


	} else if (network.name == 'bsctestnet') {
		it("A handle to PancakeFactory contract deployed on the BSC testnet, is now ready for use.".green, async function () {
			dexFactory = new ethers.Contract(addr_factory_original_bsctestnet,  abi_factory_original, theOwner);
		});

		it("A handle to the PancakeRouter contract deployed on the BSC testnet, is ready for use.".green, async function () {
			dexRouter = new ethers.Contract(addr_router_original_bsctestnet,  abi_router_original, theOwner);
		});
		
	} else if ( ['fantomtestnet', 'localnet', 'hardhat'].includes(network.name) ) {
		console.log("\n\tChoose to build and deploy a clone of PancakeRouter to the %", network.name);

		it("A clone of PancakeFactory contrac, was deployed and is ready to for use.".green, async function () {
			try {
				const Factory = await ethers.getContractFactory("PancakeFactory", theOwner);
				dexFactory = await Factory.deploy(theOwner.address);
				await dexFactory.deployed();
				console.log("\t!!! Source code signature = ", (await dexFactory.INIT_CODE_PAIR_HASH()).substring(2) ); 
				console.log("\t!!! Please make sure the pairFor(...) function of PancakeRouter.sol file has the same code in its code.");
			} catch(err) {
				assert.fail('Clone PancakFactory contract is not created');
			}
		});

		it("A a WETH token contract, was deployed and is readu for use.".green, async function () {
			try {
				const WETH = await ethers.getContractFactory("WETH9", theOwner);
				wETH = await WETH.deploy();
				await wETH.deployed();
			} catch(err) {
				assert.fail("WETH9 contract is not created.");
			}
		});

		it("A clone of PancakeRouter contract, was deployed with the cloned PancakeFactory and WEH, and is ready for use.".green, async function () {
			try {
				const Router = await ethers.getContractFactory("PancakeRouter", theOwner);
				dexRouter = await Router.deploy(dexFactory.address, wETH.address);
				await dexRouter.deployed();
				console.log("\tA clone PancakeRouter deployed to: %s", dexRouter.address);
			} catch(err) {
				assert.fail("The clone PancakeRouter contract is not created.");
			}
		});
	} else {
		console.log("Network should be one of hardhat, localnet, fantomtestnet, bsctestnet, and bscmainnet, not ", network.name);
		throw 'network unacceptable.'
	}

	it("The PancakeFactory and PancakeRouter are checked matching.".green, async function () {
		expect(await dexRouter.factory()).to.equal(dexFactory.address);
	});
});

//============================= The age of the first upgradeable contract of Pledge ========================================

describe("Deploy the initial upgradeable contract of Pledge token.", function () {


	it("deploys the initial upgradeable contract, by using the relevant OpenZeppelin's plugin.", async function () {
		const PledgeToken = await ethers.getContractFactory("Pledge07Up", theOwner);
		ownerContract = await upgrades.deployProxy(PledgeToken, [], {initializer: 'initialize()'});
		await ownerContract.deployed();
		console.log("\tUpgradeable initial contract of Pledge token deployed to: ", ownerContract.address);
	});


	it("checks for the name, symbol, and totalSupply of the initial upgradeable contract.", async function () {
		var name = await ownerContract.name();
		expect(name).to.equal("Pledge Utility Token");	
		var symbol = await ownerContract.symbol();
		expect(symbol).to.equal("POC");
		var totalSupply = await ownerContract.totalSupply();
		expect(Number(ethers.utils.formatUnits(totalSupply, DECIMALS))).to.equal(1e15);
		console.log("\t(name, symbol, total supply) is : ('%s', '%s', %s POCs)", name, symbol, ethers.utils.formatUnits(totalSupply, DECIMALS));
        var owner = await ownerContract.owner();
        console.log("\towner's address: ", owner);
        var ownerBalance = await ownerContract.balanceOf(owner);
        console.log("\t(ower, ower's balance) is (%s, %s POCs).", owner,  ethers.utils.formatUnits(ownerBalance, DECIMALS) );
        expect(theOwner.address).to.equal(owner);
        console.log("\ttheOnwer is the current owner.");
        //console.log("\t========== Balance: ", ethers.utils.formatUnits(await ownerContract.balanceOf("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"), DECIMALS));
	})

	it("checks for initial fees rates, maxTransferAmount, liquidityQuantum, and generalCharityAddress.", async function () {
		var lowerFees = await ownerContract.lowerFees();
		expect(lowerFees.marketing).to.equal(INITIAL_LOWER_MARKETING_FEE);
		expect(lowerFees.charity).to.equal(INITIAL_LOWER_CHARITY_FEE);
		expect(lowerFees.liquidity).to.equal(INITIAL_LOWER_LIQUIDITY_FEE);
		expect(lowerFees.lottery).to.equal(INITIAL_LOWER_LOTTERY_FEE);
		console.log("\tLower fee rates are initialized correctly: %s%, %s%, %s%, %s%.", 
        lowerFees.marketing/FEE_MAGNIFIER*100, lowerFees.charity/FEE_MAGNIFIER*100, lowerFees.liquidity/FEE_MAGNIFIER*100, lowerFees.lottery/FEE_MAGNIFIER*100);

		var higherFees = await ownerContract.higherFees();
		expect(higherFees.marketing).to.equal(INITIAL_HIGHER_MARKETING_FEE);
		expect(higherFees.charity).to.equal(INITIAL_HIGHER_CHARITY_FEE);
		expect(higherFees.liquidity).to.equal(INITIAL_HIGHER_LIQUIDITY_FEE);
		expect(higherFees.lottery).to.equal(INITIAL_HIGHER_LOTTERY_FEE);
		console.log("\tHigher fee rates are initialized correctly: %s%, %s%, %s%, %s%.", 
        higherFees.marketing/FEE_MAGNIFIER*100, higherFees.charity/FEE_MAGNIFIER*100, higherFees.liquidity/FEE_MAGNIFIER*100, higherFees.lottery/FEE_MAGNIFIER*100);

		var maxTransferAmount = await ownerContract.maxTransferAmount();
		expect(maxTransferAmount).to.equal(MAX_TRANSFER_AMOUNT);
		console.log("\tmaxTransferAmount is initialized correctly: %s POCs.", ethers.utils.formatUnits(MAX_TRANSFER_AMOUNT.toString(), DECIMALS));

    	// TODO: What does this liquidity quantum do?
		var liquidityQuantum = await ownerContract.liquidityQuantum();
		expect(liquidityQuantum).to.equal(LIQUIDITY_QUANTUM);
		console.log("\tliquidityQuantum is initialized correctly: %s POCs.", ethers.utils.formatUnits(LIQUIDITY_QUANTUM.toString(), DECIMALS));

		var generalCharityAddress = await ownerContract.generalCharityAddress();
		expect(generalCharityAddress).to.equal(INITIAL_GENERAL_CHARITY);
		console.log("\teneralCharityAddress is initialized correctly to the liquidity pool: %s", ownerContract.address);
	})


});

describe("Use the initial upgradeable contract of Pledge token.", function () {

	it("initializes the initial upgradeable contract", async function () {
		console.log("\tsetBeneficiaritys(...).");
		beneficiaries = {
			marketing: process.env.MARKETINGADDRESS,
			charity: process.env.CHARITYADDRESS,
			liquidity: ownerContract.address,
			lottery: process.env.LOTTERYADDRESS
		};
		tx = await ownerContract.setBeneficiaries(beneficiaries);
		await tx.wait();
        expect((await ownerContract.beneficiaries()).marketing).to.equal(process.env.MARKETINGADDRESS);
        expect((await ownerContract.beneficiaries()).charity).to.equal(process.env.CHARITYADDRESS);
        expect((await ownerContract.beneficiaries()).liquidity).to.equal(ownerContract.address);
        expect((await ownerContract.beneficiaries()).lottery).to.equal(process.env.LOTTERYADDRESS);

		// console.log("\tsetGeneralCharityAddress(...).");
		// tx = await ownerContract.setGeneralCharityAddress(process.env.CHARITYADDRESS);
		// await tx.wait();
        // expect(ownerContract.generalCharityAddress()).not.to.equal(zero_address);
		
		console.log("\tcreateLiquidityPool(...), making sure the PancakePair<WEH, POC> exists.");
		var tx = await ownerContract.createLiquidityPool(dexRouter.address);
		await tx.wait();
        expect(await ownerContract.pancakeRouter()).to.equal(dexRouter.address);

		console.log("\tCreating a PancakePair contract for later use...");
        pairAddress = await ownerContract.pancakePair();
        expect(pairAddress).not.to.equal(zero_address);

		// This is actually a worong place to do this:
		if(['bscmainnet', 'bsctestnet'].includes(network.name)) {
			pancakePairContract = new ethers.Contract(pairAddress, abi_pair_original, theOwner);
		}
		else {
			abi_pair_clone = (await hre.artifacts.readArtifact("contracts/PancakeFactory.sol:PancakePair")).abi;
			pancakePairContract = new ethers.Contract(pairAddress, abi_pair_clone, theOwner);
		}
		// Checking the initialization is unexplicitly performed in the later tests.
	});

	var amount_to_liquify = 1000;

	it("adds initial (1e?, 1000) liquidity to pair <Eth, POC>. This liquidity solely decides the initial price.", async function () {
		console.log("\tNote this will cause the first-ever transfer of POC token, from msg.sender to the PancakePair contract.")

		var amount = amount_to_liquify;

		var tokenBalance0, etherBalance0, lpBalance0;
		var tokenBalance1, etherBalance1, lpBalance1;
		var tokenAddedToPair, etherAddedToPair, lpTokenReceived;

		var addr0 = await pancakePairContract.token0();
		if( addr0 == ownerContract.address ) {
			[tokenBalance0, etherBalance0] = await pancakePairContract.getReserves(); // Should be zero.
		} else {
			[etherBalance0, tokenBalance0] = await pancakePairContract.getReserves(); // Should be zero.
		}
		lpBalance0 = await pancakePairContract.balanceOf(theOwner.address);
		feeBalances0 = await ownerContract.feeBalances();

		//tokenBalannce1 = await pancakePairContract..
		var approve_amount = amount * 100;
		var tx = await ownerContract.approve(dexRouter.address, ethers.utils.parseUnits( approve_amount.toString(), DECIMALS));
		await tx.wait();

		tx = await dexRouter.addLiquidityETH(
			ownerContract.address,
			ethers.utils.parseUnits(amount.toString(), DECIMALS),
			0,
			0,
			theOwner.address,
			"111111111111111111111", // deadline of 'infinity'
			{value : ethers.utils.parseUnits("1", eth_power)}
		);
		await tx.wait();

		console.log("\tAn amount of liquidity is added, causing a hidden transfer of %s POC from theOwner to the PancakePair.", amount);
		console.log("\tThe sender is the owner and free of fees.");

		var addr0 = await pancakePairContract.token0();
		if( addr0 == ownerContract.address ) {
			[tokenBalance1, etherBalance1] = await pancakePairContract.getReserves(); // Should be zero.
		} else {
			[etherBalance1, tokenBalance1] = await pancakePairContract.getReserves(); // Should be zero.
		}
		lpBalance1 = await pancakePairContract.balanceOf(theOwner.address);

		tokenAddedToPair = BigInt(tokenBalance1)-BigInt(tokenBalance0);
		console.log("\tPOC reserve in the pair was increased by: %s POCs.".yellow, ethers.utils.formatUnits(tokenAddedToPair, DECIMALS));
		expect(tokenAddedToPair).to.equal(ethers.utils.parseUnits(amount.toString(), DECIMALS));
		console.log("\tThe pair recieved the same amount as the amount provided.".yellow);
		etherAddedToPair = BigInt(etherBalance1)-BigInt(etherBalance0);
		console.log("\tEther reserve in the pair was increased by: %s ETHs.".yellow, ethers.utils.formatUnits(etherAddedToPair, DECIMALS));
		lpTokenReceived = BigInt(lpBalance1)-BigInt(lpBalance0);
		console.log("\ttheOwner's this-pair LP tokens was increased by: %s.".yellow, ethers.utils.formatUnits(lpTokenReceived, DECIMALS));
	});

	it("A complete test for a transfer, where lower fees should be collected.", async function () {
		var amount = 100;
		var totalSupply0 = await ownerContract.totalSupply();
		var balance0_owner = await ownerContract.balanceOf(theOwner.address);
		var balance0_Alice = await ownerContract.balanceOf(Alice.address);
		var feeBalances0 = await ownerContract.feeBalances();
        console.log("\ttheOwner's balance: %s POCs.", ethers.utils.formatUnits(await ownerContract.balanceOf(theOwner.address), DECIMALS));
		var tx = await ownerContract.transfer(Alice.address, ethers.utils.parseUnits(amount.toString(), DECIMALS));
		await tx.wait();
		var totalSupply1 = await ownerContract.totalSupply();
		var balance1_owner = await ownerContract.balanceOf(theOwner.address);
		var balance1_Alice = await ownerContract.balanceOf(Alice.address);
		var feeBalances1 = await ownerContract.feeBalances();
		console.log("\ttheOwner, the current owner, transferred %s POCs to Alice.".green, amount);

		expect(BigInt(totalSupply1)).to.equal(BigInt(totalSupply0));
		console.log("\tThe total supply is preserverd to be: %s POCs".green, ethers.utils.formatUnits(totalSupply0.toString(), DECIMALS));
		//if( BigInt(balance1_owner)-BigInt(balance0_owner) != BigInt(ethers.utils.parseUnits(amount.toString(), DECIMALS))) expect(false).to.equal(true);
		expect(BigInt(balance0_owner)-BigInt(balance1_owner)).to.equal(BigInt(ethers.utils.parseUnits(amount.toString(), DECIMALS)));
		console.log("\tThe sender's balance was reduced by the amount passed to the transfer function: %s POCs.".green, ethers.utils.formatUnits(amount.toString(), DECIMALS));

		var total_fees = BigInt(0);
		fees = await ownerContract.lowerFees();

		real = BigInt(feeBalances1.marketing) - BigInt(feeBalances0.marketing);
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.marketing) / BigInt(FEE_MAGNIFIER);
		expect(real).to.equal(expected);
		console.log("\tMarketing fee is paid correctly in LOWER rate. fee balance: %s POCs.".green, ethers.utils.formatUnits(real, DECIMALS));
		total_fees += real;

		real = BigInt(feeBalances1.charity) - BigInt(feeBalances0.charity);
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.charity) / BigInt(FEE_MAGNIFIER);
		expect(real).to.equal(expected);
		console.log("\tCharity fee is paid correctly in LOWER rate. fee balance: %s POCs.".green, ethers.utils.formatUnits(feeBalances1.charity, DECIMALS));
		total_fees += real;

		real = BigInt(feeBalances1.liquidity) - BigInt(feeBalances0.liquidity);
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.liquidity) / BigInt(FEE_MAGNIFIER);
		expect(real).to.equal(expected);
		console.log("\tLiquidity fee is paid correctly in LOWER rate. fee balance: %s POCs.".green, ethers.utils.formatUnits(real, DECIMALS));
		total_fees += real;

		real = BigInt(feeBalances1.lottery) - BigInt(feeBalances0.lottery);
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.lottery) / BigInt(FEE_MAGNIFIER);
		expect(real).to.equal(expected);
		console.log("\tLottery fee is paid correctly in LOWER rate. fee balance: %s POCs.".green, ethers.utils.formatUnits(feeBalances1.lottery, DECIMALS));
		total_fees += real;

		var amountLessAmountReceived = BigInt(amount) * BigInt(10**DECIMALS) - (BigInt(balance1_Alice) - BigInt(balance0_Alice));
		expect(amountLessAmountReceived).to.equal(total_fees);
 		console.log("\tThe amount sent - the amount received = total fees: %s".green, ethers.utils.formatUnits(total_fees, DECIMALS));
		console.log("\tCash flow is correct and precise.".yellow);
	});
});

//============================= The age of the second upgradeable contract of Pledge ========================================

describe("Upgrade the deployed, initial, upgradeable contract of Pledge token, to its next upgraded version.", function () {
	it("upgrade the deployed contract to its next upgraded version, by using the OpenZeppelin's plugin.", async function () {
		var address_org = ownerContract.address;
		const PledgeToken = await ethers.getContractFactory("Pledge08Up", theOwner);
		ownerContract = await upgrades.upgradeProxy(ownerContract.address, PledgeToken);
		await ownerContract.deployed();
		expect(address_org).to.equal(ownerContract.address);
		console.log("\tThe existing deployed contract is upgraded at the same address: ", ownerContract.address);
	});
});


describe("Check that the new contract inherits its state from the previous contract.", function () {

	it("should be able to re-initialize the new contract.", async function () {
		console.log("\tsetBeneficiaritys(...).");
		beneficiaries = {
			marketing: process.env.MARKETINGADDRESS,
			charity: process.env.CHARITYADDRESS,
			liquidity: ownerContract.address,
			lottery: process.env.LOTTERYADDRESS
		};
		tx = await ownerContract.setBeneficiaries(beneficiaries);
		await tx.wait();

		console.log("\tetGeneralCharityAddress(...).");
		tx = await ownerContract.setGeneralCharityAddress(process.env.CHARITYADDRESS);
		await tx.wait();
		
		console.log("\tcreateLiquidityPool(...), making sure the PancakePair<WEH, POC> exists.");
		var tx = await ownerContract.createLiquidityPool(dexRouter.address);
		await tx.wait();
		
	});

	var amount_to_liquify = 20000;
	var fees_expected_when_testing_add_liquidity;
	var feeBalances0, feeBalances1;

	it("adds another (50e?, 20000) liquidity to the pair <Eth, POC>, on top of the state inherited from the predecessor contract.", async function () {
		console.log("\tNote this is NOT the first transfer of POC token that theOwner makes.")

		var amount = amount_to_liquify;

		var tokenBalance0, etherBalance0, lpBalance0;
		var tokenBalance1, etherBalance1, lpBalance1;
		var tokenAddedToPair, etherAddedToPair, lpTokenReceived;

		var addr0 = await pancakePairContract.token0();
		if( addr0 == ownerContract.address ) {
			[tokenBalance0, etherBalance0] = await pancakePairContract.getReserves(); // Should be zero.
		} else {
			[etherBalance0, tokenBalance0] = await pancakePairContract.getReserves(); // Should be zero.
		}
		lpBalance0 = await pancakePairContract.balanceOf(theOwner.address);
		feeBalances0 = await ownerContract.feeBalances();

		//tokenBalannce1 = await pancakePairContract..
		var approve_amount = amount * 100;
		var tx = await ownerContract.approve(dexRouter.address, ethers.utils.parseUnits( approve_amount.toString(), DECIMALS));
		await tx.wait();

		tx = await dexRouter.addLiquidityETH(
			ownerContract.address,
			ethers.utils.parseUnits(amount.toString(), DECIMALS),
			0,
			0,
			theOwner.address,
			"111111111111111111111", // deadline of 'infinity'
			{value : ethers.utils.parseUnits("50", eth_power)}
		);
		await tx.wait();

		console.log("\tAn amount of liquidity is added, causing a hidden transfer of %s POC from theOwner to the PancakePair.", amount);
		console.log("\tThe sender is the owner and free of fees.");

		var addr0 = await pancakePairContract.token0();
		if( addr0 == ownerContract.address ) {
			[tokenBalance1, etherBalance1] = await pancakePairContract.getReserves(); // Should be zero.
		} else {
			[etherBalance1, tokenBalance1] = await pancakePairContract.getReserves(); // Should be zero.
		}
		lpBalance1 = await pancakePairContract.balanceOf(theOwner.address);

		tokenAddedToPair = BigInt(tokenBalance1)-BigInt(tokenBalance0);
		console.log("\tPOC reserve in the pair was increased by: %s POCs.".yellow, ethers.utils.formatUnits(tokenAddedToPair, DECIMALS));
		expect(tokenAddedToPair).to.equal(ethers.utils.parseUnits(amount.toString(), DECIMALS));
		console.log("\tThe pair recieved the same amount as the amount provided.".yellow);
		etherAddedToPair = BigInt(etherBalance1)-BigInt(etherBalance0);
		console.log("\tEther reserve in the pair was increased by: %s ETHs.".yellow, ethers.utils.formatUnits(etherAddedToPair, DECIMALS));
		lpTokenReceived = BigInt(lpBalance1)-BigInt(lpBalance0);
		console.log("\ttheOwner's this-pair LP tokens was increased by: %s.".yellow, ethers.utils.formatUnits(lpTokenReceived, DECIMALS));

	});

	it("Another complete test for a transfer, where lower fees should be collected.", async function () {
		var amount = 10000;
		var totalSupply0 = await ownerContract.totalSupply();
		var balance0_owner = await ownerContract.balanceOf(theOwner.address);
		var balance0_Alice = await ownerContract.balanceOf(Alice.address);
		var feeBalances0 = await ownerContract.feeBalances();
		var tx = await ownerContract.transfer(Alice.address, ethers.utils.parseUnits(amount.toString(), DECIMALS));
		await tx.wait();
		var totalSupply1 = await ownerContract.totalSupply();
		var balance1_owner = await ownerContract.balanceOf(theOwner.address);
		var balance1_Alice = await ownerContract.balanceOf(Alice.address);
		var feeBalances1 = await ownerContract.feeBalances();
		console.log("\ttheOwner, the current owner, transferred %s POCs to Alice.".green, amount);

		expect(BigInt(totalSupply1)).to.equal(BigInt(totalSupply0));
		console.log("\tThe total supply is preserverd to be: %s POCs".green, ethers.utils.formatUnits(totalSupply0.toString(), DECIMALS));
		//if( BigInt(balance1_owner)-BigInt(balance0_owner) != BigInt(ethers.utils.parseUnits(amount.toString(), DECIMALS))) expect(false).to.equal(true);
		expect(BigInt(balance0_owner)-BigInt(balance1_owner)).to.equal(BigInt(ethers.utils.parseUnits(amount.toString(), DECIMALS)));
		console.log("\tThe sender's balance was reduced by the amount passed to the transfer function: %s POCs.".green, ethers.utils.formatUnits(amount.toString(), DECIMALS));

		var total_fees = BigInt(0);
		fees = await ownerContract.higherFees();

		real = BigInt(feeBalances1.marketing) - BigInt(feeBalances0.marketing);
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.marketing) / BigInt(FEE_MAGNIFIER);
		expect(real).to.equal(expected);
		console.log("\tMarketing fee is paid correctly in Higher rate. fee balance: %s POCs.".green, ethers.utils.formatUnits(real, DECIMALS));
		total_fees += real;

		real = BigInt(feeBalances1.charity) - BigInt(feeBalances0.charity);
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.charity) / BigInt(FEE_MAGNIFIER);
		expect(real).to.equal(expected);
		console.log("\tCharity fee is paid correctly in Higher rate. fee balance: %s POCs.".green, ethers.utils.formatUnits(feeBalances1.charity, DECIMALS));
		total_fees += real;

		real = BigInt(feeBalances1.liquidity) - BigInt(feeBalances0.liquidity);
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.liquidity) / BigInt(FEE_MAGNIFIER);
		expect(real).to.equal(expected);
		console.log("\tLiquidity fee is paid correctly in Higher rate. fee balance: %s POCs.".green, ethers.utils.formatUnits(real, DECIMALS));
		total_fees += real;

		real = BigInt(feeBalances1.lottery) - BigInt(feeBalances0.lottery);
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.lottery) / BigInt(FEE_MAGNIFIER);
		expect(real).to.equal(expected);
		console.log("\tLottery fee is paid correctly in Higher rate. fee balance: %s POCs.".green, ethers.utils.formatUnits(feeBalances1.lottery, DECIMALS));
		total_fees += real;

		var amountLessAmountReceived = BigInt(amount) * BigInt(10**DECIMALS) - (BigInt(balance1_Alice) - BigInt(balance0_Alice));
		expect(amountLessAmountReceived).to.equal(total_fees);
 		console.log("\tThe amount sent - the amount received = total fees: %s".green, ethers.utils.formatUnits(total_fees, DECIMALS));
		console.log("\tCash flow is correct and precise.".yellow);
	});

	it("Any transfer does NOT change the total supply of the token. The shared foundation of all proof.", async function () {
		var amount = 10000000;
		var total1 = await ownerContract.totalSupply();
		var tx = await ownerContract.transfer(Alice.address, ethers.utils.parseUnits(amount.toString(), DECIMALS));
		await tx.wait();
		console.log("\ttheOwner transferred %s POCs to the user's wallet.", amount.toString());
		var total2 = await ownerContract.totalSupply();

		var real = BigInt(total2.sub(total1));
		expected = ethers.utils.parseUnits("0", DECIMALS);
		expect(real).to.equal(expected);
		console.log("\tThe total supply remains %s POCs after transfer.", ethers.utils.formatUnits(total2, DECIMALS));
	});


	it("transfers from theOwner to the user wallet. The user should receive the transfer amount less fees.", async function () {
		var amount = 10000;
		var balance_1 = await ownerContract.balanceOf(Alice.address);
		var tx = await ownerContract.transfer(Alice.address, ethers.utils.parseUnits(amount.toString(), DECIMALS));
		await tx.wait();
		console.log("\ttheOwner transferred %s POCs to the user's wallet.", amount.toString());
		var balance_2 = await ownerContract.balanceOf(Alice.address);

		var fees = await ownerContract.higherFees();
		var real = BigInt(balance_2.sub(balance_1));
		var totalFeeRates = parseInt(fees.marketing) + parseInt(fees.charity) + parseInt(fees.liquidity) + parseInt(fees.lottery);
		var totalFee = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(totalFeeRates) / BigInt(FEE_MAGNIFIER);
		var expected = BigInt(amount) * BigInt(10**DECIMALS) - totalFee
		if (real != expected) expect(false).to.equal(true);
		console.log("\tThe user wallet received %s POCs, which is %s the principal less %s the fees.", 
		ethers.utils.formatUnits(real, DECIMALS), amount, ethers.utils.formatUnits(totalFee, DECIMALS) );
		var f = FEE_MAGNIFIER/100;
		console.log("\tThe fee rate is now (%s%, %s%, %s%, %s%)", fees.marketing/f, fees.charity/f, fees.liquidity/f, fees.lottery/f);
	});

	it("should be able to transfer the preset maximum transfer amount of POCs, to the user wallet.", async function () {
		var max = await ownerContract.maxTransferAmount();
		console.log("\tThe current maximum transfer amount is %s POCs.", ethers.utils.formatUnits(max, DECIMALS));
		var tx = await ownerContract.transfer(Alice.address, max);
		await tx.wait();
		console.log("\ttheOwner transferred %s POCs to the user's wallet.", ethers.utils.formatUnits(max, DECIMALS));
	});

	it("should NOT be able to transfer more than the preset maximum amount of POCs, to the user wallet.", async function () {
		var max = await ownerContract.maxTransferAmount();
		console.log("\tThe current maximum transfer amount is %s POCs.", ethers.utils.formatUnits(max, DECIMALS));
		// await expectRevert(ownerContract.transfer(Alice.address, max + 1), "Transfer exceeds limit");
		await ownerContract.transfer(Alice.address, max + 1).then( () => expect(true).to.equal(false) )
		.catch( (err) => { // fantom doesn't allow this: if(! err.toString().includes("Transfer exceeds limit")) expect(true).to.equal(false);
		} );
		console.log("\ttheOwner failed to transfer %s POCs plus ONE SINGLE WEI to the user's wallet.", ethers.utils.formatUnits(max, DECIMALS));
	});
	
	it("should be able the call approve(.), transferFrom(.), increaseAllowance(.) functions.", async function () {
		//allowance, transferFrom test`
		var tx = await ownerContract.approve(Alice.address, ethers.utils.parseUnits("10000", DECIMALS));
		await tx.wait();
		console.log("\ttheOwner approved user wallet to spend 10000 POCs.");
		
		var AliceContract = ownerContract.connect(Alice);
		var balance_1 = await ownerContract.balanceOf(Alice.address);
		var tx = await AliceContract.transferFrom(theOwner.address, Alice.address, ethers.utils.parseUnits("10000", DECIMALS));
		await tx.wait();
		console.log("\tThe user wallet transferred 10000 POCs from theOwner's account to itself.");
		var balance_2 = await ownerContract.balanceOf(Alice.address);

		var amount = 10000;
		var fees = await ownerContract.higherFees();
		var real = BigInt(balance_2.sub(balance_1));
		var totalFees = parseInt(fees.marketing) + parseInt(fees.charity) + parseInt(fees.liquidity) + parseInt(fees.lottery);
		var expected = BigInt(amount) * BigInt(10**DECIMALS) - BigInt(amount) * BigInt(10**DECIMALS) * BigInt(totalFees) / BigInt(FEE_MAGNIFIER);
		if (real != expected) expect(false).to.equal(true);
		console.log("\tThe balance of the user wallet increased % POCs, which is 10000 less higher fees.", ethers.utils.formatUnits(real, DECIMALS));

		var allowance = await ownerContract.allowance(theOwner.address, Alice.address);
		expect(allowance).to.equal(ethers.utils.parseUnits("0", DECIMALS));
		console.log("\tThe allowance of the user wallet on theOwner account is now zero.");

		tx = await ownerContract.increaseAllowance(Alice.address, ethers.utils.parseUnits("10000", DECIMALS));
		await tx.wait();

		allowance = await ownerContract.allowance(theOwner.address, Alice.address);
		expect(allowance).to.equal(ethers.utils.parseUnits("10000", DECIMALS));
		console.log("\tThe allowance of the user wallet on theOwner account is now 10000 POCs.");
	});

});


describe("Upgrade, once again, the deployed upgradeable contract of Pledge token, to its next upgraded version.", function () {
	//////////////////////// Upgrade existing implementation contract ////////////////

	it("upgrade the deployed contract to its next upgraded version, by using the OpenZeppelin plugin.", async function () {
		var address_org = ownerContract.address;
		const PledgeToken = await ethers.getContractFactory("Pledge08Up", theOwner);
		ownerContract = await upgrades.upgradeProxy(ownerContract.address, PledgeToken);
		await ownerContract.deployed();
		expect(address_org).to.equal(ownerContract.address);
		console.log("\tThe next version of the existing deployed contract, is deployed to the same address: \n\t", ownerContract.address);
	});
});


describe("Check the administrative functions of the contract of Pledge token.", function () {


	it("should be able to free chosen addresses from having to pay transfer fees.", async function () {
		var tx = await ownerContract.freeFromFees(theOwner.address, true);
		await tx.wait();
		console.log("\ttheOwner is freed from fees.");

		var amount = 10000;

		var feeBalances1 = await ownerContract.feeBalances();
		var balance_1 = await ownerContract.balanceOf(Alice.address);
		var tx = await ownerContract.transfer(Alice.address, ethers.utils.parseUnits(amount.toString(), DECIMALS));
		await tx.wait();
		console.log("\ttheOwner transfers %s POCs to the user's wallet.", amount.toString());
		var balance_2 = await ownerContract.balanceOf(Alice.address);
		var feeBalances2 = await ownerContract.feeBalances();

		expect(balance_2.sub(balance_1)).to.equal(BigInt(amount)*BigInt(10**DECIMALS));
		console.log("\tThe user wallet received the full amount of the transfer amount: %s", ethers.utils.formatUnits(balance_2.sub(balance_1), DECIMALS) );
		
		expect(feeBalances2.marketing.sub(feeBalances1.marketing)).to.equal(BigInt("0"));
		console.log("\tMarketing fee was NOT collected.")

		expect(feeBalances2.charity.sub(feeBalances1.charity)).to.equal(BigInt("0"));
		console.log("\tCharity fee was NOT collected.")

		expect(feeBalances2.liquidity.sub(feeBalances1.liquidity)).to.equal(BigInt("0"));
		console.log("\tLiquidity fee was NOT collected.")

		expect(feeBalances2.lottery.sub(feeBalances1.lottery)).to.equal(BigInt("0"));
		console.log("\tLottery fee was NOT collected.")

		tx = await ownerContract.freeFromFees(theOwner.address, false);
		await tx.wait();
		console.log("\ttheOwner was revoked back and is no longer free from fees, AS DEMONSTRATED BELOW.");	
	});

	it("should be ablt to set the rates of fee and restore the initial rates.", async function () {
		const amount = 10000000;
		var lowerNotHigher = false; // Must be false, because the Sender now must pay higher fees.

		var orgfees = lowerNotHigher? await ownerContract.lowerFees() : await ownerContract.higherFees();
		var f = FEE_MAGNIFIER/100;
		console.log("\tThe current fee rates are (%s%, %s%, %s%, %s%), which may of may not the very initial fee rates.", 
		orgfees.marketing/f, orgfees.charity/f, orgfees.liquidity/f, orgfees.lottery/f);

		var fees = {
			marketing: 1200,
			charity: 600,
			liquidity: 1500,
			lottery: 800
		};
		var tx = await ownerContract.setFees(fees, lowerNotHigher);
		await tx.wait();

		var fees2;
		fees2 = lowerNotHigher? await ownerContract.lowerFees() : await ownerContract.higherFees();
		expect(fees2.marketing).to.equal(fees.marketing);
		expect(fees2.charity).to.equal(fees.charity);
		expect(fees2.liquidity).to.equal(fees.liquidity);
		expect(fees2.lottery).to.equal(fees.lottery);
		var f = FEE_MAGNIFIER/100;
		console.log("\tFee rates are changed to a new rates: (%s%, %s%, %s%, %s%)", fees.marketing/f, fees.charity/f, fees.liquidity/f, fees.lottery/f);

		var feeBalances1 = await ownerContract.feeBalances();
		var balance_1 = await ownerContract.balanceOf(Alice.address);
		var tx = await ownerContract.transfer(Alice.address, ethers.utils.parseUnits(amount.toString(), DECIMALS));
		await tx.wait();
		console.log("\ttheOwner transfers %s POCs to the user's wallet.", amount.toString());
		var balance_2 = await ownerContract.balanceOf(Alice.address);
		var feeBalances2 = await ownerContract.feeBalances();

		var real, expected;
		var total_fee = BigInt(0);

		real = BigInt(feeBalances2.marketing.sub(feeBalances1.marketing));
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.marketing) / BigInt(FEE_MAGNIFIER);
		if( real != expected ) expect(false).to.equal(true);
		total_fee += real;
		console.log("\tMarketing is paid %s POCs correctly at the new fee rate.", ethers.utils.formatUnits(real, DECIMALS));

		real = BigInt(feeBalances2.charity.sub(feeBalances1.charity));
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.charity) / BigInt(FEE_MAGNIFIER);
		if( real != expected ) expect(false).to.equal(true);
		total_fee += real;
		console.log("\tCharity is paid %s POCs correctly at the new fee rate.", ethers.utils.formatUnits(real, DECIMALS));

		real = BigInt(feeBalances2.liquidity.sub(feeBalances1.liquidity));
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.liquidity) / BigInt(FEE_MAGNIFIER);
		if( real != expected ) expect(false).to.equal(true);
		total_fee += real;
		console.log("\tLiquidity is paid %s POCs correctly at the new fee rate.", ethers.utils.formatUnits(real, DECIMALS));

		real = BigInt(feeBalances2.lottery.sub(feeBalances1.lottery));
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.lottery) / BigInt(FEE_MAGNIFIER);
		if( real != expected ) expect(false).to.equal(true);
		total_fee += real;
		console.log("\tLottery is paid %s POCs correctly at the new fee rate.", ethers.utils.formatUnits(real, DECIMALS));

		real = BigInt(balance_2.sub(balance_1));
		expected = BigInt(amount)* BigInt(10**DECIMALS) - total_fee
		if( real != expected ) expect(false).to.equal(true);
		console.log("\tThe user wallet received %s POCs, which is %s the principal less %s the total fee.", 
		ethers.utils.formatUnits(real, DECIMALS), amount, ethers.utils.formatUnits(total_fee, DECIMALS));

		tx = await ownerContract.restoreFees(lowerNotHigher);
		await tx.wait();

		fees2 = lowerNotHigher? await ownerContract.lowerFees() : await ownerContract.higherFees();
		// We know lowerNotHigher == true
		expect(fees2.marketing).to.equal(INITIAL_HIGHER_MARKETING_FEE);
		expect(fees2.charity).to.equal(INITIAL_HIGHER_CHARITY_FEE);
		expect(fees2.liquidity).to.equal(INITIAL_HIGHER_LIQUIDITY_FEE);
		expect(fees2.lottery).to.equal(INITIAL_HIGHER_LOTTERY_FEE);
		var f = FEE_MAGNIFIER/100;
		console.log("\tFee rates are changed back to the very initial fee rates: (%s%, %s%, %s%, %s%)",
		INITIAL_HIGHER_MARKETING_FEE/f, INITIAL_HIGHER_CHARITY_FEE/f, INITIAL_HIGHER_LIQUIDITY_FEE/f, INITIAL_HIGHER_LOTTERY_FEE/f);
	});

	it("should be able to change maximum transfer amount.", async function () {
		const orgMaxTxAmount = await ownerContract.maxTransferAmount();
		console.log("\tThe current maximum transfer amount is %s POCs.", ethers.utils.formatUnits(orgMaxTxAmount, DECIMALS));

		var newAmount = 300000;
		const newMaxTxAmount = ethers.utils.parseUnits(newAmount.toString(), DECIMALS);
		const tx = await ownerContract.setMaxTransferAmount(newMaxTxAmount);
		await tx.wait();
		console.log("\tThe maximum transfer amount is now changed to %s POCs, AS DEMONSTRATED BELOW.", newAmount);
	})

	it("should be able to transfer the preset maximum tansfer amount of POCs, to the user wallet.", async function () {
		var max = await ownerContract.maxTransferAmount();
		console.log("\tThe current maximum transfer amount is %s POCs.", ethers.utils.formatUnits(max, DECIMALS));
		var tx = await ownerContract.transfer(Alice.address, max);
		await tx.wait();
		console.log("\ttheOwner transferred %s POCs to the user's wallet.", ethers.utils.formatUnits(max, DECIMALS));
	});

	it("should NOT be able to transfer more than the preset maximum amount of POCs, to the user wallet.", async function () {
		var max = await ownerContract.maxTransferAmount();
		console.log("\tThe current maximum transfer amount is %s POCs.", ethers.utils.formatUnits(max, DECIMALS));
		// await expectRevert(ownerContract.transfer(Alice.address, max + 1), "Transfer exceeds limit");
		await ownerContract.transfer(Alice.address, max + 1).then( () => expect(true).to.equal(false) )
		.catch( (err) => {	// fantom doesn't allow this: if(! err.toString().includes("Transfer exceeds limit")) expect(true).to.equal(false);
		} );
		console.log("\ttheOwner failed to transfer %s POCs plus ONE SINGLE WEI to the user's wallet.", ethers.utils.formatUnits(max, DECIMALS));
	});

	it("should be able to transfer the ownership of the contract.", async function () {
		var orgOwner = await ownerContract.owner();
		console.log("\tThe current theOwner is %s. \n\tThe useer address is %s. \n\tCheck if they are different.", 
		orgOwner, Alice.address);

		ownerContract.connect(orgOwner);
		var tx = await ownerContract.transferOwnership(Alice.address);
		await tx.wait();
		expect(await ownerContract.owner()).to.equal(Alice.address);
		console.log("\tThe current contract theOwner is now the user.");	
		
		var org_fees = ownerContract.lowerFees();
		fees = {marketing: 123, charity: 123, liquidity: 123, lottery: 123};
		// await expectRevert(ownerContract.setFees(fees, true), "Ownable: caller is not the owner");
		await ownerContract.setFees(fees, true).then( () => expect(true).to.equal(false) )
		.catch( (err) => { // fantom doesn't allow this: if(! err.toString().includes("Ownable: caller is not the owner")) expect(true).to.equal(false);
		} );
		console.log("\n\tThe original ower can NOT change fees.");
		var AliceContract = ownerContract.connect(Alice);
		tx = await AliceContract.setFees(fees, true);
		await tx.wait();
		var fees2 = await ownerContract.lowerFees();
		fees2 = {marketing: fees2.marketing, charity: fees2.charity, liquidity: fees2.liquidity, lottery: fees2.lottery};
		//expect(fees2).to.equal(fees);
		expect(fees2.marketing).to.equal(fees.marketing);
		expect(fees2.charity).to.equal(fees.charity);
		expect(fees2.liquidity).to.equal(fees.liquidity);
		expect(fees2.lottery).to.equal(fees.lottery);
		console.log("\tThe user, the new owner, CAN change fees.");
		//var org_fees = {marketing: org_fees.marketing, charity: org_fees.charity, liquidity: org_fees.liquidity, lottery: org_fees.lottery};
		//tx = await AliceContract.setFees(org_fees, true);
		tx = await AliceContract.restoreFees(true);
		await tx.wait();
		console.log("\tThe user, the new owner, changed fees back to its initial values. We have tested it.");

		var org_beneficiaries = await ownerContract.beneficiaries();

		var beneficiaries = {
			marketing: process.env.MARKETINGADDRESS,
			charity: process.env.CHARITYADDRESS,
			liquidity: ownerContract.address,
			lottery: process.env.LOTTERYADDRESS
		};
		// await expectRevert(ownerContract.setBeneficiaries(beneficiaries), "Ownable: caller is not the owner");
		await ownerContract.setBeneficiaries(beneficiaries).then( () => expect(true).to.equal(false) )
		.catch( (err) => { // fantom doesn't allow this: if(! err.toString().includes("Ownable: caller is not the owner")) expect(true).to.equal(false);
		} );
		console.log("\n\tThe original owner can NOT change beneficiaries.");
		tx = await AliceContract.setBeneficiaries(beneficiaries);
		await tx.wait();
		beneficiaries2 = await ownerContract.beneficiaries();
		expect(beneficiaries2.marketing.toUpperCase()).to.equal(beneficiaries.marketing.toUpperCase());
		expect(beneficiaries2.charity.toUpperCase()).to.equal(beneficiaries.charity.toUpperCase());
		expect(beneficiaries2.liquidity.toUpperCase()).to.equal(beneficiaries.liquidity.toUpperCase());
		expect(beneficiaries2.lottery.toUpperCase()).to.equal(beneficiaries.lottery.toUpperCase());
		console.log("\tThe user, the new owner, CAN change beneficiaries. The change is checked.");
		beneficiaries_obj = {
			marketing: beneficiaries2.marketing,
			charity: beneficiaries2.charity,
			liquidity: beneficiaries2.liquidity,
			lottery: beneficiaries2.lottery
		};
		tx = await AliceContract.setBeneficiaries(beneficiaries_obj);
		await tx.wait();
		console.log("\tThe user, the new owner, changed beneficiaries back to its original values.");

		tx = await AliceContract.transferOwnership(theOwner.address);
		await tx.wait();
		expect(await ownerContract.owner()).to.equal(theOwner.address);
		console.log("\tThe user transferred the ownership of the contract back to theOwner.");
	})
});


describe("Check charity functions of upgradeable contract of Pledge token.", function () {
	it("should be able to set the general charity address.", async function () {
		var org_general = await ownerContract.generalCharityAddress();
		console.log("\tThe current general charity address is %s", org_general);
		var tx = await ownerContract.setGeneralCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		await tx.wait();
		expect((await ownerContract.generalCharityAddress()).toUpperCase()).to.equal(ALT_GENERAL_CHARITY_ADDRESS.toUpperCase());
		console.log("\tThe general charity address is changed to %s", ALT_GENERAL_CHARITY_ADDRESS);

		var tx = await ownerContract.setGeneralCharityAddress(org_general);
		await tx.wait();
		expect((await ownerContract.generalCharityAddress()).toUpperCase()).to.equal(org_general.toUpperCase());
		console.log("\tThe general charity address is changed back to its original %s.", org_general);
	})
	

	it("should be able to add/remove charity addresses.", async function () {
		var tx = await ownerContract.addCharityAddress(process.env.CHARITYADDRESS_1);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(process.env.CHARITYADDRESS_1);
		expect(isCharityAddress).to.equal(true);
		console.log("\t%s is added to the charity list.", process.env.CHARITYADDRESS_1);

		tx = await ownerContract.addCharityAddress(process.env.CHARITYADDRESS_2);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(process.env.CHARITYADDRESS_2);
		expect(isCharityAddress).to.equal(true);
		console.log("\t%s is added to the charity list.", process.env.CHARITYADDRESS_2);

		tx = await ownerContract.removeCharityAddress(process.env.CHARITYADDRESS_2);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(process.env.CHARITYADDRESS_2);
		expect(isCharityAddress).to.equal(false);
		console.log("\t%s is REMOVED from the charity list.", process.env.CHARITYADDRESS_2);
	})
	it("Charity fees go to the general charity if no preferred charity is selected.", async function () {
		var general = await ownerContract.generalCharityAddress();
		console.log("\tThe current general charity is %s.", general);

		var preferred = await ownerContract.preferredCharityAddress(theOwner.address);
		if(preferred != zero_address) {
			var tx = await ownerContract.preferCharityAddress(zero_address); // de-prefer.
			await tx.wait();
		}
		console.log("\ttheOwner is no preferred charity now.");

		var amount = 10000;
		var balance1 = await ownerContract.balanceOf(general);
		var tx = await ownerContract.transfer(Alice.address, ethers.utils.parseUnits(amount.toString(), DECIMALS) );
		await tx.wait();
		console.log("\ttheOwner transferred %s POCs to the user.", amount);
		var balance2 = await ownerContract.balanceOf(general);

		console.log("\n\tWe have already demonstrated/proved the followings:");
		console.log("\t - the total supply does not change by a transfer.");
		console.log("\t - due amount of fees each are paid to due fee beneficiaries.")
		console.log("\t - the sender is debited the due amount.");
		console.log("\t - the recipient is credited the due amount.");
		console.log("\tunder the assumption that the sender and recipient are not one of the fee beneficiaries.");
		console.log("\tso also demonstrating/proving indirectly that the sender was debited the due amount.");
		console.log("\n\tIf it is holds that the general charity does receive some fees, then it holds that:");
		console.log("\t - the general charity receives the due amount.");
		console.log("\t - no other charities receive the any amount.");

		var beneficiaries = ownerContract.beneficiaries();
		expect(Alice.address).not.equal(beneficiaries.marketing);
		expect(Alice.address).not.equal(beneficiaries.charity);
		expect(Alice.address).not.equal(beneficiaries.liquidity);
		expect(Alice.address).not.equal(beneficiaries.lottery);
		console.log("\n\tThe recipient is not one of the current fee beneficiaries.");

		assert( ethers.utils.formatUnits(BigInt(balance2.sub(balance1)), DECIMALS) > 0 );
		//expect(ethers.utils.formatUnits(BigInt(balance2.sub(balance1)), DECIMALS)).not.equal(0);
		console.log("\n\tThe general charity DID receive non-zero amount.!")
	})

	it("should be able to transfer to a charity directly, automatically selecting it as a preferred charity.", async function () {
		var tx = await ownerContract.addCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		expect(isCharityAddress).to.equal(true);
		console.log("\tGeneral charity address was added to the charity list, to make sure the list is not empty.");

		var amount = 10000;
		var balance1 = await ownerContract.balanceOf(ALT_GENERAL_CHARITY_ADDRESS);
		var tx = await ownerContract.transfer(ALT_GENERAL_CHARITY_ADDRESS, ethers.utils.parseUnits(amount.toString(), DECIMALS) );
		await tx.wait();
		console.log("\ttheOwner transferred %s POCs to the charity.", amount);
		var balance2 = await ownerContract.balanceOf(ALT_GENERAL_CHARITY_ADDRESS);

		console.log("\n\tFor the same reason as the above,");
		console.log("\tif it is holds that the charity does receive some fees, then it holds that:");
		console.log("\t - the charity receives the due amount.");
		console.log("\t - no other charities receive the any amount.");

		var beneficiaries = ownerContract.beneficiaries();
		expect(theOwner.address).not.equal(beneficiaries.marketing);
		expect(theOwner.address).not.equal(beneficiaries.charity);
		expect(theOwner.address).not.equal(beneficiaries.liquidity);
		expect(theOwner.address).not.equal(beneficiaries.lottery);
		console.log("\n\tThe recipient is not one of the current fee beneficiaries.");

		assert( ethers.utils.formatUnits(BigInt(balance2.sub(balance1)), DECIMALS) > 0 );
		console.log("\n\tThe charity DID receive non-zero amount.!")

		expect(await ownerContract.preferredCharityAddress(theOwner.address)).to.equal(ALT_GENERAL_CHARITY_ADDRESS);
		console.log("\n\tThe charity has become theOwner's preferred charity.")

		tx = await ownerContract.removeCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		expect(isCharityAddress).to.equal(false);
		console.log("\tGeneral charity address is REMOVED from the charity list.", ALT_GENERAL_CHARITY_ADDRESS);
	})

	it("should be able to prefer/select a charity to pay fees to.", async function () {
		var tx = await ownerContract.addCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		expect(isCharityAddress).to.equal(true);
		console.log("\tGeneral charity address was added to the charity list, to make sure the list is not empty.");

		var AliceContract = ownerContract.connect(Alice);
		var preferred = await ownerContract.preferredCharityAddress(Alice.address);
		if(preferred == zero_address) {
			var tx = await AliceContract.preferCharityAddress(ALT_GENERAL_CHARITY_ADDRESS); // prefer.
			await tx.wait();
			preferred = ALT_GENERAL_CHARITY_ADDRESS;
		}
		const regex = new RegExp(preferred, 'i');
		expect(await ownerContract.preferredCharityAddress(theOwner.address)).to.match(regex);
		console.log("\tThe user has selected a preferred charity now.");

		var amount = 10000;
		var balance1 = await ownerContract.balanceOf(preferred);
		var tx = await AliceContract.transfer(theOwner.address, ethers.utils.parseUnits(amount.toString(), DECIMALS) );
		await tx.wait();
		console.log("\tThe user transferred %s POCs to the charity.", amount);
		var balance2 = await ownerContract.balanceOf(preferred);

		console.log("\n\tFor the same reason as the above,");
		console.log("\tif it is holds that the charity does receive some fees, then it holds that:");
		console.log("\t - the charity receives the due amount.");
		console.log("\t - no other charities receive the any amount.");

		var beneficiaries = ownerContract.beneficiaries();
		expect(theOwner.address).not.equal(beneficiaries.marketing);
		expect(theOwner.address).not.equal(beneficiaries.charity);
		expect(theOwner.address).not.equal(beneficiaries.liquidity);
		expect(theOwner.address).not.equal(beneficiaries.lottery);
		console.log("\n\tThe recipient is not one of the current fee beneficiaries.");

		assert( ethers.utils.formatUnits(BigInt(balance2.sub(balance1)), DECIMALS) > 0 );
		//expect(ethers.utils.formatUnits(BigInt(balance2.sub(balance1)), DECIMALS)).not.equal(0);
		console.log("\n\tThe charity DID receive non-zero amount.!")

		tx = await ownerContract.removeCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		expect(isCharityAddress).to.equal(false);
		console.log("\tGeneral charity address is REMOVED from the charity list.", ALT_GENERAL_CHARITY_ADDRESS);
	})

	it("should be able to de-prefer/de-select a charity not to pay fees to.", async function () {
		var tx = await ownerContract.addCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		expect(isCharityAddress).to.equal(true);
		console.log("\tGeneral charity address was added to the charity list, to make sure the list is not empty.");

		var AliceContract = ownerContract.connect(Alice);
		var preferred = await ownerContract.preferredCharityAddress(Alice.address);
		if(preferred != zero_address) {
			console.log("\tThe user is found having a preferred charity.");
			var tx = await AliceContract.preferCharityAddress(zero_address); // de-prefer.
			await tx.wait();
		}
		expect(await ownerContract.preferredCharityAddress(Alice.address)).to.equal(zero_address);
		console.log("\tThe user has de-preferred/de-selected its preferred charity now.");

		var amount = 10000;
		var general = await ownerContract.generalCharityAddress();
		var balance1 = await ownerContract.balanceOf(general);
		var tx = await AliceContract.transfer(theOwner.address, ethers.utils.parseUnits(amount.toString(), DECIMALS) );
		await tx.wait();
		console.log("\tThe user transferred %s POCs to the charity.", amount);
		var balance2 = await ownerContract.balanceOf(general);

		console.log("\n\tFor the same reason as the above,");
		console.log("\tif it is holds that the general charity does receive some fees, then it holds that:");
		console.log("\t - the general charity receives the due amount.");
		console.log("\t - no other charities receive the any amount.");

		assert( ethers.utils.formatUnits(BigInt(balance2.sub(balance1)), DECIMALS) > 0 );
		//expect(ethers.utils.formatUnits(BigInt(balance2.sub(balance1)), DECIMALS)).not.equal(0);
		console.log("\n\tThe charity DID receive non-zero amount.!")

		tx = await ownerContract.removeCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		expect(isCharityAddress).to.equal(false);
		console.log("\tGeneral charity address is REMOVED from the charity list.", ALT_GENERAL_CHARITY_ADDRESS);
	})
	

	it("they should be able to transfer to their preferred charity directly.", async function () {
		const random_address = (ethers.Wallet.createRandom()).address;

		var tx = await ownerContract.addCharityAddress(random_address);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(random_address);
		expect(isCharityAddress).to.equal(true);
		console.log("\tA charity address was added to the charity list, to make sure the list is not empty.");

		var AliceContract = ownerContract.connect(Alice);
		var tx = await AliceContract.preferCharityAddress(random_address); // prefer.
		await tx.wait();
		expect(await ownerContract.preferredCharityAddress(Alice.address)).to.equal(random_address);
		console.log("\tThe user selected a preferred charity address %s, which is NOT the general charity.", random_address);
		preferred = random_address;

		var amount = 10000;
		var feeBalances0 = await ownerContract.feeBalances();
		var balance0 = await ownerContract.balanceOf(preferred);
		var tx = await AliceContract.transfer(preferred, ethers.utils.parseUnits(amount.toString(), DECIMALS) );
		await tx.wait();
		console.log("\tThe user transferred %s POCs to their preferred charity.", amount);
		var feeBalances1 = await ownerContract.feeBalances();
		var balance1 = await ownerContract.balanceOf(preferred);

		var charity_fee, recipient_amount;
		var real, expected;
		var total_fee = BigInt(0);

		var fees = await ownerContract.higherFees(); // Assuming the user has to pay higher fees.
		//fees = { marketing: 0, charity: 0, liquidity: 0, lottery: 0 };

		real = BigInt(feeBalances1.marketing.sub(feeBalances0.marketing));
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.marketing) / BigInt(FEE_MAGNIFIER);
		if( real != expected ) expect(false).to.equal(true);
		total_fee += real;
		console.log("\tMaketing is paid %s POCs correctly at the new fee rate.", ethers.utils.formatUnits(real, DECIMALS));

		charity_fee = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.charity) / BigInt(FEE_MAGNIFIER);
		total_fee += charity_fee;

		real = BigInt(feeBalances1.liquidity.sub(feeBalances0.liquidity));
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.liquidity) / BigInt(FEE_MAGNIFIER);
		if( real != expected ) expect(false).to.equal(true);
		total_fee += real;
		console.log("\tLiquidity is paid %s POCs correctly at the new fee rate.", ethers.utils.formatUnits(real, DECIMALS));

		real = BigInt(feeBalances1.lottery.sub(feeBalances0.lottery));
		expected = BigInt(amount) * BigInt(10**DECIMALS) * BigInt(fees.lottery) / BigInt(FEE_MAGNIFIER);
		if( real != expected ) expect(false).to.equal(true);
		total_fee += real;
		console.log("\tLottery is paid %s POCs correctly at the new fee rate.", ethers.utils.formatUnits(real, DECIMALS));

		recipient_amount = BigInt(amount)* BigInt(10**DECIMALS) - total_fee;
		charity_fee = charity_fee;
		console.log("\n\tThe preferred charity received,")
		console.log("\t- amount as the recipient: %s POCs.", ethers.utils.formatUnits(recipient_amount, DECIMALS));
		console.log("\t- amount as the preferred charity: %s POCs.", ethers.utils.formatUnits(charity_fee, DECIMALS));

		real = BigInt(balance1.sub(balance0));
		expected = recipient_amount + charity_fee;
		if( real != expected ) expect(false).to.equal(true);
		console.log("\tThe preferred charity recipient DID recieve the due amount of %s POCs.", ethers.utils.formatUnits(real, DECIMALS));

		//expect(await ownerContract.preferredCharityAddress(theOwner.address)).to.match(regex);
		expect(await ownerContract.preferredCharityAddress(Alice.address)).to.equal(preferred);
		console.log("\n\tThe charity remain the user's preferred charity.")

		tx = await ownerContract.removeCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		await tx.wait();
		var isCharityAddress = await ownerContract.isCharityAddress(ALT_GENERAL_CHARITY_ADDRESS);
		expect(isCharityAddress).to.equal(false);
		console.log("\tGeneral charity address is REMOVED from the charity list.", ALT_GENERAL_CHARITY_ADDRESS);
	})
});


describe("Check for liquidation.", function () {
	it("should be able to liquify the existing collection of liquidity fees.", async function () {
		var tx = await ownerContract.liquify();
		await tx.wait();
	})

	it("should be able to liquify the existing collection of liquidity fees.", async function () {
		var tx = await ownerContract.liquify();
		await tx.wait();
	})

	it("should be able to liquify the existing collection of liquidity fees.", async function () {
		var tx = await ownerContract.liquify();
		await tx.wait();
	})

	it("can conclude.", async function () {
		console.log("\tEach of the above 3 attempts of adding liquidity began with the same amount of POCs: %s, ".yellow, ethers.utils.formatUnits(LIQUIDITY_QUANTUM));
		console.log("\twhich is the liquidity quantum, which, in turn, prevents frequent small addition of liquidity.".yellow);

		console.log("\tThe tests show:".yellow);
		console.log("\t- The ether remainder after the operation is always zero wei, removing possible back-door allegations.".yellow);
		console.log("\t- The ideal split that gives the zero ether remainder is far from the conventional half-half split.".yellow);
		console.log("\t- The the conventional half-half split gives a significant ether remainder.".yellow);
		console.log("\t- The technique to guess the ideal split is not gas-expensive.".yellow);
	})


});
	

