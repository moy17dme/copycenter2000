import PointOfSale from '../components/PointOfSale';
import { usePosAccess } from '../lib/usePosAccess';
export default function PosPage({user,onOpenAuth}) {
  const access=usePosAccess(user?.id);
  return <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6">
    {!user ? <div className="pos"><h2>Punto de venta</h2><p className="pos-help">Ingresa con el correo que autorizó el administrador. Si recibiste una invitación, abre primero ese correo para crear tu contraseña.</p><button className="pos-primary" onClick={onOpenAuth}>Ingresar con mi cuenta</button></div> :
      access.loading ? <p role="status">Verificando acceso…</p> :
      !access.allowed ? <div className="pos"><h2>Tu cuenta no tiene acceso al punto de venta</h2><p className="pos-help">El administrador debe autorizar tu correo en Empleados. Revisa también que hayas confirmado tu correo.</p>{access.error && <p role="alert">No se pudo verificar el acceso. Intenta de nuevo.</p>}<button onClick={access.refresh}>Revisar acceso</button></div> :
      <><p className="mb-5 text-sm text-slate-400">{access.admin?'Administrador':access.name} · Caja compartida de mostrador</p><PointOfSale access={access} /></>}
  </main>;
}
