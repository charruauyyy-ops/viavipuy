import styles from "./PaymentBlock.module.css";

export default function PaymentBlock() {
  return (
    <section
      className={styles.wrap}
      aria-label="Formas de pago"
      data-testid="payment-block"
    >
      <div className={styles.divider} />

      <div className={styles.imageWrap}>
        <img
          className={styles.image}
          src="/ui/formas-de-pago.png"
          alt="Formas de pago: Mercado Libre, Tarjetas de crédito, Abitab, Redpagos, Transferencia"
          loading="lazy"
          draggable={false}
        />
      </div>

      <div className={styles.divider} />
    </section>
  );
}
