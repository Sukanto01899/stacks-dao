;; Minimal SIP-010 compatible governance token for DAO voting power.

(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_INSUFFICIENT_BALANCE u101)
(define-constant ERR_INVALID_AMOUNT u102)

(define-data-var token-admin principal tx-sender)
(define-data-var total-supply uint u0)

(define-map balances
  { holder: principal }
  { balance: uint }
)

(define-constant TOKEN_NAME "Stacks DAO")
(define-constant TOKEN_SYMBOL "DAO")
(define-constant TOKEN_DECIMALS u6)

(define-read-only (get-name)
  (ok TOKEN_NAME)
)

(define-read-only (get-symbol)
  (ok TOKEN_SYMBOL)
)

(define-read-only (get-decimals)
  (ok TOKEN_DECIMALS)
)

(define-read-only (get-token-uri)
  (ok none)
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

(define-read-only (get-balance (owner principal))
  (let ((entry (map-get? balances { holder: owner })))
    (ok (default-to u0 (get balance entry)))
  )
)

(define-private (set-balance (owner principal) (amount uint))
  (map-set balances { holder: owner } { balance: amount })
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (if (is-eq amount u0)
      (err ERR_INVALID_AMOUNT)
      (if (is-eq tx-sender sender)
        (let (
            (sender-balance (default-to u0 (get balance (map-get? balances { holder: sender }))))
            (recipient-balance (default-to u0 (get balance (map-get? balances { holder: recipient }))))
          )
          (if (< sender-balance amount)
            (err ERR_INSUFFICIENT_BALANCE)
            (begin
              (set-balance sender (- sender-balance amount))
              (set-balance recipient (+ recipient-balance amount))
              (ok true)
            )
          )
        )
        (err ERR_UNAUTHORIZED)
      )
    )
  )
)

(define-public (mint (recipient principal) (amount uint))
  (if (is-eq tx-sender (var-get token-admin))
    (if (is-eq amount u0)
      (err ERR_INVALID_AMOUNT)
      (let ((current (default-to u0 (get balance (map-get? balances { holder: recipient })))))
        (set-balance recipient (+ current amount))
        (var-set total-supply (+ (var-get total-supply) amount))
        (ok true)
      )
    )
    (err ERR_UNAUTHORIZED)
  )
)
