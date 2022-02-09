# Pledge Token

<b>I.  Description</b>

- An upgradeable DeFi token, Pledge Utility Token, is built and tested on Hardhat platform.
- The use cases are illustrated by 'Use cases.png' file in the 'architecture' folder.
- The architecture is illustrated by "Inheritance.png" in the 'architecture' folder.
- It's a comprehensive ERC20 token, with a wide range of functionalities, like Context, Initializable, Ownable, IERC20, IERC20Metadata, ERC20Burnable, and ERC20PresetFixedSupply in terms of OpenZeppelin.
- It hooks transfer and transferFrom transactions to collect fees, from sender/recipient, to some designated addresses, like marketing, lottary, charities, and treasury. The tokens paid to the tresury are regularly liqified to the token's Pancakeswap pair. There is a simple restriction mechanisim that encourage token holders to hold longer. The contract liquifies tresury tokens on a quantum basis, to avoid frequent small transaction as well as a single huge transaction. This will save gas and prevent price flucutation.
- The reason Pancakeswap code is redundantly copied is they the currently running Pancakeswap contracts are of lower version Solidity, while OpenZeppelin contracts are now available in higher verions.

- <b>Pledge01Up.sol</b> file: the code for Pledge01Up contract, the 1st version of Pledge token. The basic functionalities are copied from OpenZepplin as intact as possible. The chunk of ERC20 code was redundantly re-written, instead of importing/inheriting from OpenZeppelin, because the mapping _balances of ERC20 is private and cannot be accessed in inheriting contracts. The hooking technique requires to have _balanceOf mapping in the same contract.

- <b>Pledge02Up.sol</b> file: the code for Pledge02Up contract, the 2nd version of Pledge token. It syntactically inherits from Pledge01Up contracts. You can modify or remove inherited functions, append new variables to the inherited ones, add new functions. You can <b>NOT</b> remove, change order of, insert a new one between, the inherited variables. Note you do <b>NOT</b> have to syntactically inherit from Pledge1Up to build Pledge02Up, as long as you keep the rule. You can, instead, build from scratch, although it is less likely to happen.

- <b>Pledge03Up.sol</b>: (Pending. Not included in the official delivery.) the code for Pledge03Up contract, which is another implementation of the 1st version of Pledge token. Unlike Pledge01Up token, the ERC20 chunk of code is not re-written and neatly imported/inherited from OpenZeppelin, but inherited by Solidity's contract inheritance syntax. The private mapping _balances is re-defined in the inherited contract.

- <b>test_Pledge01Up.js</b>: the testing scenario for Pledge01 and Pledge02Up contracts is like this: Pledge01Up is deployed. It is first checked that Pledge01Up's funcions, like initialization, work changing Pledge01UP's state values. Then Pledge02 is deployed in place of Pledge01Up replacing it, inherits all state values from the predecessor, performs its functions on the inherited state values together with its newly introduced state values. This way, the upgradeability of Pledge01 is checked and the upgradation techique is demonstrated for maintainers. The test cases can be developed more at your request. See 'test_Pledge01Up.js' file for more.


<b>II. Installation</b>

1. Clone this repository to your local machine.

2. Setup compilation/testing env in the local folder (All are necessary and nothing is optional):

    - Do not npm init --yes (package.json is created)
    - npm install --save-dev hardhat (package-lock.json is created)
    - Do not npx hardhat (Select Create an advanced sample project)

    - Make sure Python > 3.0 is installed. Try call "python" and check the version.

    - npm install --save-dev "hardhat@^2.7.0" "@nomiclabs/hardhat-waffle@^2.0.0" "ethereum-waffle@^3.0.0" "chai@^4.2.0" "@nomiclabs/hardhat-ethers@^2.0.0" "ethers@^5.0.0" "@nomiclabs/hardhat-etherscan@^2.1.3" "dotenv@^10.0.0" "eslint@^7.29.0" "eslint-config-prettier@^8.3.0" "eslint-config-standard@^16.0.3" "eslint-plugin-import@^2.23.4" "eslint-plugin-node@^11.1.0" "eslint-plugin-prettier@^3.4.0" "eslint-plugin-promise@^5.1.0" "hardhat-gas-reporter@^1.0.4" "prettier@^2.3.2" "prettier-plugin-solidity@^1.0.0-beta.13" "solhint@^3.3.6" "solidity-coverage@^0.7.16"

    - npm install --save-dev hardhat-deploy

    - npm install --save-dev dotenv
    - npm install --save-dev colors

    - npm install --save-dev @openzeppelin/test-helpers

    - npm install --save-dev @openzeppelin/hardhat-upgrades
    // npm install --save-dev @nomiclabs/hardhat-ethers ethers # peer dependencies
    
    - npm install --save-dev @openzeppelin/contracts-upgradeable

    - Do not npm install --save @nomiclabs/hardhat-web3 web3 //, as you wont be using web3 for this project.

3. Install API keys in the following environmental variable names (See the configuration file for more):

    - "Infura_Key" : your Infura project key.
    - "Etherscan_API_Key" : you etherscan API key.
    

4. Create your own ".env" file in the project root folder.
   
        Below is a sample:

        PRIVATEKEY = d25634ab25df2a5d37cb8818de77fe0d72d971de3deeda3b0130709d8db5720c
        MARKETINGADDRESS = 0x89183Af8f61F31a0fB74f3ae69e495684Adaca84
        CHARITYADDRESS = 0xC8aBefbfa104Fd4F2bE8c02b2fb97364E11f1d7E
        LOTTERYADDRESS = 0x239fA7623354eC26520dE878B52f13Fe84b06971
        CHARITYADDRESS_1 = 0x977a6B645d98CF58f2b02a17E1E51D7228D091e7
        CHARITYADDRESS_2 = 0xc9C5a6191aE93181F29BEc78D64C84A561bA6c37
        TOKEN_NAME = "Pledge Utility Token"


<b>III. Deliverables</b>

- Pledge01Up.sol is a complete upgradeable contract conforming with the current Pledge token specifications. It also demonstrate how to build an upgradeable contract as per the current PLEDGE specifications.
- Pledge02Up.sol demonstrates how to upgrade the Pledge01Up contract. It is also a template for an upgraded Pledge contract.
- 'test_Pledge01Up.js' demonstrates, as well as tests, how to deply Pledge01Up contract, and how to deploy its upgraded version Uledge02Up contract. Note it actually and mainly tests the upgraded version.
- 'deploy.js' deploys Pledge01Up contract.
- 'deploy-upgrade.js' deploys an upgraded version of the Pledge contract.
- Other files are auxiliary for compilation, testing, and deployment.


<b>IV. Deploying/Using the first PLEDGE contract</b>

- Check the file '.env' for correct parameters.
- Deploy and initialize Pledge01Up contract by using 'deploy.js'.
- Use the Pledge01Up contract deployed.

- Use "npx hardhat run scripts/deploy.js --network fantomtestnet" to deploy Pledge01Up contract on the fantom testnet.


<b>V. Upgrading PLEDGE contract, assuming your previous contact is Pledge01Up</b>

- Build an upgraded PLEDGE contract by completing 'Pledge02Up.sol' file.
- Replace "The address of the Pledge contract deploeyd comes here" text in the file with the address that is obtained when you first deploy a Pledge contract. 
- Compile by running 'npx hardhat compile'.
- Make sure you are connecting the same network that Pledge01Up contract was deployed to.
- Deploy by running 'upgrade.js'.
- Continue to run any applications, on-chain or off-chain, that were interoperating with the previous, Pledge01Up contract.
