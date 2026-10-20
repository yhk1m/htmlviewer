# html.bgnl.kr 앞단

DNS(가비아) `html.bgnl.kr → cname.vercel-dns.com` 이 Vercel 을 가리키므로, 이 Vercel 프로젝트(`htmlviewer-site`)가
GitHub Pages(`yhk1m.github.io/htmlviewer/`)를 그대로 중계한다. `/admin` 은 배포 페이지와 다른 주소인
중계 서버(`htmlviewer-relay.vercel.app/admin`)로 보낸다. 배포: 이 폴더에서 `vercel deploy --prod`.
