;; DAO treasury for STX and SIP-010 token transfers.

(define-constant ERR_UNAUTHORIZED u101)
(define-constant ERR_TRANSFER_FAILED u102)

(define-constant TRANSFER_ADAPTER .transfer-adapter-v1)
(define-constant GOVERNANCE_TOKEN .governance-token-v1)

(define-private (is-authorized-adapter)
  (is-eq contract-caller TRANSFER_ADAPTER)
)

(define-public (execute-stx-transfer (amount uint) (recipient principal) (memo (optional (buff 34))))
  (if (is-authorized-adapter)
    (match (as-contract (stx-transfer? amount tx-sender recipient))
      ok-result (ok true)
      err-code (err ERR_TRANSFER_FAILED)
    )
    (err ERR_UNAUTHORIZED)
  )
)

(define-public (execute-ft-transfer
    (amount uint)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (if (is-authorized-adapter)
    (match (as-contract (contract-call? GOVERNANCE_TOKEN transfer amount tx-sender recipient memo))
      ok-result (ok true)
      err-code (err ERR_TRANSFER_FAILED)
    )
    (err ERR_UNAUTHORIZED)
  )
)
