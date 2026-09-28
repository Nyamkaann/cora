import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Нууцлалын бодлого / Privacy Policy — Cora',
  description: 'Cora Post app-ийн нууцлалын бодлого ба өгөгдөл устгах журам',
}

const CONTACT_EMAIL = 'nyamdorjmunk@gmail.com'
const EFFECTIVE_DATE = '2026-09-28'

function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
      {CONTACT_EMAIL}
    </a>
  )
}

// Public page: Meta's reviewers load it without signing in.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-12 px-4 py-10 text-sm leading-relaxed">
      <section lang="mn" className="space-y-4">
        <h1 className="text-2xl font-semibold">Нууцлалын бодлого</h1>
        <p className="text-muted-foreground">Хүчин төгөлдөр болсон огноо: {EFFECTIVE_DATE}</p>

        <h2 className="text-lg font-semibold">Хэн ажиллуулдаг вэ</h2>
        <p>
          &ldquo;Cora Post&rdquo; app болон Cora админ самбарыг Cora брэндийн эзэн Нямдорж Мөнхтулга
          ажиллуулдаг.
        </p>

        <h2 className="text-lg font-semibold">Зорилго</h2>
        <p>
          Энэ app нь зөвхөн Cora-гийн өөрийн Facebook Page болон Instagram account руу
          бүтээгдэхүүний пост нийтлэхэд ашиглагдана. Бусад хүний Page, account-д нийтлэл
          хийдэггүй.
        </p>

        <h2 className="text-lg font-semibold">Цуглуулдаг өгөгдөл</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Meta-гийн access token (Page token)</li>
          <li>Cora-гийн Facebook Page ID, нэр, холбогдсон Instagram account ID</li>
          <li>Нийтэлсэн постын ID, холбоос ба Graph API-ийн дуудлагын техникийн log (token-ийг масклаж хадгална)</li>
        </ul>
        <p>
          Хэрэглэгчдийн хувийн мэдээлэл цуглуулдаггүй. Page-ийн дагагч, сэтгэгдэл, мессеж зэрэг
          бусад хүний өгөгдөлд ханддаггүй.
        </p>

        <h2 className="text-lg font-semibold">Хадгалалт</h2>
        <p>
          Өгөгдөл Supabase (Postgres) өгөгдлийн санд хадгалагдана. Access token-ийг AES-256-GCM
          шифрлэлтээр шифрлэж хадгалдаг. Админ самбарт зөвхөн нэвтэрсэн админ хандана.
        </p>

        <h2 className="text-lg font-semibold">Дамжуулалт</h2>
        <p>
          Өгөгдлийг гуравдагч талд зардаггүй, дамжуулдаггүй, зар сурталчилгаанд ашигладаггүй.
          Үйлчилгээ ажиллахад шаардлагатай хэмжээнд л дэд бүтцийн үйлчилгээ үзүүлэгчид (Supabase —
          өгөгдлийн сан, Vercel — hosting) болон пост нийтлэхийн тулд Meta руу илгээгдэнэ.
        </p>

        <h2 id="data-deletion" className="scroll-mt-4 text-lg font-semibold">
          Өгөгдөл устгах журам
        </h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <Mail /> хаяг руу &ldquo;Өгөгдөл устгах хүсэлт&rdquo; гэсэн гарчигтай имэйл илгээнэ үү.
          </li>
          <li>
            Ажиллуулагч хүсэлтийг хүлээн авсны дараа хадгалсан access token, Page/Instagram
            account ID болон холбогдох API log-ийг өгөгдлийн сангаас гараар устгана.
          </li>
          <li>Устгасны дараа тантай имэйлээр баталгаажуулна.</li>
        </ol>
        <p>
          Мөн Facebook-ийн Settings → Business Integrations хэсгээс &ldquo;Cora Post&rdquo; app-ийг
          хасаж, хандах эрхийг шууд цуцалж болно. Энэ тохиолдолд хадгалсан token хүчингүй болох
          боловч өгөгдлийн сангаас бүрэн устгуулахын тулд дээрх имэйлийг илгээнэ үү.
        </p>

        <h2 className="text-lg font-semibold">Холбоо барих</h2>
        <p>
          <Mail />
        </p>
      </section>

      <hr />

      <section lang="en" className="space-y-4">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="text-muted-foreground">Effective date: {EFFECTIVE_DATE}</p>

        <h2 className="text-lg font-semibold">Who operates this app</h2>
        <p>
          The &ldquo;Cora Post&rdquo; app and the Cora admin dashboard are operated by Nyamdorj
          Munkhtulga, owner of the Cora brand.
        </p>

        <h2 className="text-lg font-semibold">Purpose</h2>
        <p>
          This app is used only to publish product posts to Cora&rsquo;s own Facebook Page and
          Instagram account. It does not publish to anyone else&rsquo;s Page or account.
        </p>

        <h2 className="text-lg font-semibold">Data we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Meta access token (Page token)</li>
          <li>Cora&rsquo;s Facebook Page ID and name, and the linked Instagram account ID</li>
          <li>IDs and links of published posts, and a technical log of Graph API calls (tokens are masked)</li>
        </ul>
        <p>
          We do not collect personal information about users, and we do not access other
          people&rsquo;s data such as Page followers, comments or messages.
        </p>

        <h2 className="text-lg font-semibold">Storage</h2>
        <p>
          Data is stored in a Supabase (Postgres) database. Access tokens are encrypted with
          AES-256-GCM before they are stored. Only the signed-in administrator can access the
          dashboard.
        </p>

        <h2 className="text-lg font-semibold">Sharing</h2>
        <p>
          We do not sell or share data with third parties and do not use it for advertising. Data
          is processed only as needed to run the service by our infrastructure providers (Supabase
          for the database, Vercel for hosting) and sent to Meta to publish posts.
        </p>

        <h2 className="text-lg font-semibold">Data deletion</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Send an email with the subject &ldquo;Data deletion request&rdquo; to <Mail />.
          </li>
          <li>
            After receiving the request, the operator manually deletes the stored access token,
            Page/Instagram account IDs and related API logs from the database.
          </li>
          <li>You will receive an email confirming the deletion.</li>
        </ol>
        <p>
          You can also remove the &ldquo;Cora Post&rdquo; app in Facebook Settings → Business
          Integrations to revoke its access immediately. This invalidates the stored token; to have
          it removed from our database, please also send the email above.
        </p>

        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          <Mail />
        </p>
      </section>
    </main>
  )
}
