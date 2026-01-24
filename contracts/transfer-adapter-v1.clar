;; Adapter that executes treasury transfers for DAO proposals.

(impl-trait .traits.dao-adapter-trait)

(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_INVALID_PAYLOAD u101)
(define-constant ERR_TREASURY_FAILED u102)

(define-constant DAO_CORE .dao-core-v3)
(define-constant DAO_TREASURY .dao-treasury-v1)

(define-private (is-core-caller)
  (is-eq contract-caller DAO_CORE)
)

(define-private (is-stx-transfer (payload (tuple (kind (string-ascii 16)) (amount uint) (recipient principal) (token (optional principal)) (memo (optional (buff 34))))))
  (is-eq (get kind payload) "stx-transfer")
)

(define-private (is-ft-transfer (payload (tuple (kind (string-ascii 16)) (amount uint) (recipient principal) (token (optional principal)) (memo (optional (buff 34))))))
  (is-eq (get kind payload) "ft-transfer")
)

(define-private (valid-payload (payload (tuple (kind (string-ascii 16)) (amount uint) (recipient principal) (token (optional principal)) (memo (optional (buff 34))))))
  (let ((amount (get amount payload)))
    (and (> amount u0)
      (or
        (and (is-stx-transfer payload) (is-none (get token payload)))
        (and (is-ft-transfer payload) (is-some (get token payload)))
      )
    )
  )
)

(define-public (execute (payload (tuple (kind (string-ascii 16)) (amount uint) (recipient principal) (token (optional principal)) (memo (optional (buff 34))))))
  (if (is-core-caller)
    (if (valid-payload payload)
      (if (is-stx-transfer payload)
        (match (contract-call? DAO_TREASURY execute-stx-transfer (get amount payload) (get recipient payload) (get memo payload))
          ok-result (ok ok-result)
          err-code (err ERR_TREASURY_FAILED)
        )
        (match (contract-call? DAO_TREASURY execute-ft-transfer (unwrap-panic (get token payload)) (get amount payload) (get recipient payload) (get memo payload))
          ok-result (ok ok-result)
          err-code (err ERR_TREASURY_FAILED)
        )
      )
      (err ERR_INVALID_PAYLOAD)
    )
    (err ERR_UNAUTHORIZED)
  )
)
