//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./Pledge01Up.sol";

contract Pledge02Up is Pledge01Up {

	///////////// Initialization functions, following OpenZeppelin's stype. Not required /////////////

    function __PledgeV6_init() public initializer {
		__Ownable_init();
	    __PledgeV6_init_unchained();
	}

    function __PledgeV6_init_unchained() public initializer {
	    __Pledge_init_unchained();
    }

	////////////////////// Override/Modify base contract's functions ////////



	////////////////////// Add new variales /////////////////////////////////



	///////////////////// Add new functions /////////////////////////////////
	

}