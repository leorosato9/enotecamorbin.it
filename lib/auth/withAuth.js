
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';

export function withAuth(handler, options = {}) {
  return async function (req, res) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ success: false, message: 'Autenticazione richiesta.' });
    }

    if (options.requiredRole) {
      const userRole = session.user.role;
      
      const hasRequiredRole = Array.isArray(options.requiredRole)
        ? options.requiredRole.includes(userRole)
        : userRole === options.requiredRole;

      if (!hasRequiredRole) {
        return res.status(403).json({ success: false, message: 'Accesso negato. Permessi insufficienti.' });
      }
    }

    if (options.authorize) {
      const isAuthorized = await options.authorize(session, req);
      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: 'Accesso negato.' });
      }
    }

    return handler(req, res, session);
  };
}