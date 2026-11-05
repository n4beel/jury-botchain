export const JURY_ABI = [
  {
    "type": "function",
    "name": "ACCEPT_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_DECIDE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FEE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_PAGE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_STAKE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_TERMS_BYTES",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_DECIDE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_STAKE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "accept",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "byParty",
    "inputs": [
      {
        "name": "addr",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "list",
        "type": "tuple[]",
        "internalType": "struct Jury.Case[]",
        "components": [
          {
            "name": "a",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "b",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "acceptBy",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "decideBy",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "decideSecs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum Jury.State"
          },
          {
            "name": "stake",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "fee",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "termsHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "termsBlock",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "votesA",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "votesB",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancel",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "caseCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "caseOf",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Jury.Case",
        "components": [
          {
            "name": "a",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "b",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "acceptBy",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "decideBy",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "decideSecs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum Jury.State"
          },
          {
            "name": "stake",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "fee",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "termsHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "termsBlock",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "votesA",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "votesB",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "concede",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "expire",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "jurorsOf",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[3]",
        "internalType": "address[3]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "latest",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ids",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "list",
        "type": "tuple[]",
        "internalType": "struct Jury.Case[]",
        "components": [
          {
            "name": "a",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "b",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "acceptBy",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "decideBy",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "decideSecs",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum Jury.State"
          },
          {
            "name": "stake",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "fee",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "termsHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "termsBlock",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "votesA",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "votesB",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "open",
    "inputs": [
      {
        "name": "b",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "jurors",
        "type": "address[3]",
        "internalType": "address[3]"
      },
      {
        "name": "terms",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "stake",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "fee",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "decideSecs",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "pending",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "vote",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "forA",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "votedBy",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "who",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Accepted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "decideBy",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Cancelled",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Conceded",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "by",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "winner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Decided",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "pot",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "jurorsPaid",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Expired",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Opened",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "a",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "b",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "jurors",
        "type": "address[3]",
        "indexed": false,
        "internalType": "address[3]"
      },
      {
        "name": "terms",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "termsHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "stake",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "fee",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "acceptBy",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Voted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "juror",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "forA",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyVoted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadJurors",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadParams",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadParty",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadTerms",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoSuchCase",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotExpired",
    "inputs": [
      {
        "name": "decideBy",
        "type": "uint64",
        "internalType": "uint64"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotJuror",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOffered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotParty",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotVoting",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToWithdraw",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooLate",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WrongPayment",
    "inputs": [
      {
        "name": "expected",
        "type": "uint128",
        "internalType": "uint128"
      }
    ]
  }
] as const;
