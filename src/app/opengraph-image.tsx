import { ImageResponse } from 'next/og';

export const alt = 'Gestion ORÉA — Holding immobilière';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '4px',
              height: '48px',
              backgroundColor: '#B8976A',
              borderRadius: '4px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '64px',
                fontWeight: 400,
                color: 'white',
                letterSpacing: '0.15em',
                fontFamily: 'Georgia, serif',
              }}
            >
              ORÉA
            </span>
            <span
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
              }}
            >
              Holding immobilière
            </span>
          </div>
        </div>
        <div
          style={{
            width: '60px',
            height: '1px',
            backgroundColor: '#B8976A',
            marginBottom: '24px',
          }}
        />
        <span
          style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          Acquérir · Repositionner · Croître
        </span>
      </div>
    ),
    { ...size }
  );
}
