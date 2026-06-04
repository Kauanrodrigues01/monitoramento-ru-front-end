import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';

export function NotFound() {
  usePageTitle('Página não encontrada');

  return (
    <div className="siis-panel animate-slide-up">
      <div className="siis-panel-header">
        <span className="siis-panel-title">ERRO DE NAVEGAÇÃO</span>
        <span className="siis-panel-tag">HTTP 404</span>
      </div>

      <div className="siis-404-body">
        <div className="siis-404-code">404</div>
        <div className="siis-404-title">PÁGINA NÃO ENCONTRADA</div>
        <div className="siis-404-sub">A rota solicitada não existe neste sistema</div>
        <Link to="/" className="siis-submit-btn siis-404-btn">
          ← VOLTAR AO INÍCIO
        </Link>
      </div>
    </div>
  );
}
